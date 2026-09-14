import crypto from 'crypto';
import db from '../config/database.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { uploadMedia, sendReceiptTemplate, normalizePhoneNumber } from './whatsappService.js';
import { generateReceiptPdfBuffer } from './pdfService.js';

/**
 * WhatsApp Notification Orchestrator & Durable Outbox Manager.
 * 
 * Strict Architectural Guarantees:
 * 1. createOutboxEntryTx() executes inside the SQLite payment transaction.
 * 2. Background dispatch processes independently from the HTTP lifecycle.
 * 3. Concurrency locking via database prevents duplicate dispatches.
 * 4. A Meta HTTP 200 marks SENT only (wamid stored).
 * 5. Webhooks drive transitions to DELIVERED, READ, FAILED.
 * 6. Payment status and receipt generation NEVER depend on Meta availability.
 * 7. Zero logging of secrets or tokens.
 */

/**
 * Inserts a QUEUED outbox record inside the caller's SQLite transaction.
 * Attempt count starts strictly at 0.
 */
export function createOutboxEntryTx(database, { payment, receipt }) {
  const notificationId = crypto.randomUUID();
  const phone = (payment.donor_mobile || receipt.donor_mobile || '').trim();
  const templateName = process.env.WHATSAPP_RECEIPT_TEMPLATE_NAME || 'temple_payment_receipt';
  const templateLang = process.env.WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE || 'en_US';

  const stmt = database.prepare(`
    INSERT INTO whatsapp_notifications (
      id, payment_id, receipt_id, recipient_phone,
      template_name, template_language, status, provider,
      attempt_count, dispatch_locked_until, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', 'META_WHATSAPP', 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  stmt.run(
    notificationId,
    payment.id,
    receipt.id,
    phone,
    templateName,
    templateLang
  );

  return database.prepare('SELECT * FROM whatsapp_notifications WHERE id = ?').get(notificationId);
}

/**
 * Schedules background outbox processing independently from the HTTP request.
 */
export function triggerBackgroundDispatch(receiptId) {
  setImmediate(() => {
    processOutboxNotification(receiptId).catch((err) => {
      console.error(`[WhatsApp Outbox] Dispatch error for receipt ${receiptId}:`, err.message);
    });
  });
}

/**
 * Processes a single outbox notification item using database concurrency locking.
 */
export async function processOutboxNotification(receiptId) {
  if (!receiptId) return null;

  // 1. Database-Level Concurrency Lock
  // Atomically lock record by moving to PROCESSING and setting dispatch_locked_until (60s)
  const lockResult = db.prepare(`
    UPDATE whatsapp_notifications
    SET status = 'PROCESSING',
        dispatch_locked_until = datetime('now', '+60 seconds'),
        last_attempt_at = CURRENT_TIMESTAMP,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE receipt_id = ? 
      AND (status IN ('QUEUED', 'FAILED') OR dispatch_locked_until < datetime('now'))
  `).run(receiptId);

  if (lockResult.changes === 0) {
    // Record is either already processing, locked, or already SENT/DELIVERED
    return { locked: true, message: 'Notification already processing or delivered.' };
  }

  const notification = db.prepare('SELECT * FROM whatsapp_notifications WHERE receipt_id = ?').get(receiptId);
  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
  const payment = notification?.payment_id 
    ? db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(notification.payment_id)
    : null;

  if (!notification || !receipt) {
    console.error(`[WhatsApp Outbox] Missing notification or receipt for receiptId: ${receiptId}`);
    return null;
  }

  try {
    // 2. Validate and Normalize Recipient Phone Number
    let normalizedPhone;
    try {
      normalizedPhone = normalizePhoneNumber(notification.recipient_phone, 'IN');
    } catch (phoneErr) {
      const errorMsg = `Phone normalization failed: ${phoneErr.message}`;
      db.prepare(`
        UPDATE whatsapp_notifications
        SET status = 'FAILED',
            error_code = 'INVALID_PHONE_NUMBER',
            error_message = ?,
            last_error_at = CURRENT_TIMESTAMP,
            dispatch_locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(errorMsg, notification.id);

      logAuditEvent(
        'WHATSAPP_FAILED',
        `व्हॉट्सअ‍ॅप पावती पाठवणे अयशस्वी (अवैध फोन नंबर): पावती क्र. ${receipt.receipt_no} | त्रुटी: ${errorMsg}`,
        { id: 'system', name: 'WhatsApp Outbox Service', role: 'SYSTEM' }
      );

      return { success: false, status: 'FAILED', error: errorMsg };
    }

    // 3. Generate Official PDF Receipt Buffer
    const pdfBuffer = await generateReceiptPdfBuffer(receipt);
    const pdfFilename = `${receipt.receipt_no}_Official_Receipt.pdf`;

    // 4. Upload Media to Meta Cloud API (/media endpoint)
    const mediaId = await uploadMedia(pdfBuffer, pdfFilename, 'application/pdf');

    // 5. Send Approved Template with Document Header
    const sendResult = await sendReceiptTemplate({
      recipientPhone: normalizedPhone,
      donorName: receipt.donor_name || 'Devotee',
      receiptNo: receipt.receipt_no,
      amount: receipt.amount,
      mediaId,
      filename: pdfFilename
    });

    const wamid = sendResult.meta_message_id;

    // 6. Transition state to SENT (Meta accepted the message and provided wamid)
    db.prepare(`
      UPDATE whatsapp_notifications
      SET status = 'SENT',
          meta_message_id = ?,
          sent_at = CURRENT_TIMESTAMP,
          error_code = NULL,
          error_message = NULL,
          dispatch_locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(wamid, notification.id);

    logAuditEvent(
      'WHATSAPP_SENT',
      `व्हॉट्सअ‍ॅप पावती यशस्वीरित्या पाठवली: पावती क्र. ${receipt.receipt_no} | मो: ${normalizedPhone} | Meta ID: ${wamid}`,
      { id: 'system', name: 'WhatsApp Outbox Service', role: 'SYSTEM' }
    );

    return {
      success: true,
      status: 'SENT',
      meta_message_id: wamid
    };
  } catch (dispatchErr) {
    const safeErrorMsg = (dispatchErr.message || 'Meta Cloud API dispatch failed').slice(0, 500);
    const errCode = String(dispatchErr.code || 'META_API_ERROR');

    // 7. Update status to FAILED (leaves payment VERIFIED and receipt untouched)
    db.prepare(`
      UPDATE whatsapp_notifications
      SET status = 'FAILED',
          error_code = ?,
          error_message = ?,
          last_error_at = CURRENT_TIMESTAMP,
          dispatch_locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(errCode, safeErrorMsg, notification.id);

    logAuditEvent(
      'WHATSAPP_FAILED',
      `व्हॉट्सअ‍ॅप पावती पाठवणे अयशस्वी: पावती क्र. ${receipt.receipt_no} | त्रुटी: ${safeErrorMsg} (Code: ${errCode})`,
      { id: 'system', name: 'WhatsApp Outbox Service', role: 'SYSTEM' }
    );

    return {
      success: false,
      status: 'FAILED',
      error: safeErrorMsg
    };
  }
}

/**
 * Handles incoming Meta Webhook status updates (sent, delivered, read, failed).
 * Only verified webhook events may transition SENT -> DELIVERED / READ / FAILED.
 */
export function handleWebhookStatusEvent(statusEvent) {
  if (!statusEvent || !statusEvent.id) {
    return { ignored: true, reason: 'Status event missing message id (wamid).' };
  }

  const wamid = statusEvent.id;
  const rawStatus = (statusEvent.status || '').toLowerCase();
  const timestamp = statusEvent.timestamp 
    ? new Date(parseInt(statusEvent.timestamp, 10) * 1000).toISOString()
    : new Date().toISOString();

  const notification = db.prepare('SELECT * FROM whatsapp_notifications WHERE meta_message_id = ?').get(wamid);
  if (!notification) {
    return { ignored: true, reason: `No notification record matched wamid: ${wamid}` };
  }

  if (rawStatus === 'sent') {
    db.prepare(`
      UPDATE whatsapp_notifications
      SET sent_at = COALESCE(sent_at, ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(timestamp, notification.id);

    return { updated: true, status: 'SENT' };
  }

  if (rawStatus === 'delivered') {
    db.prepare(`
      UPDATE whatsapp_notifications
      SET status = 'DELIVERED',
          delivered_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(timestamp, notification.id);

    logAuditEvent(
      'WHATSAPP_DELIVERED',
      `व्हॉट्सअ‍ॅप पावती भाविकाला पोहोचली (DELIVERED): पावती ID: ${notification.receipt_id} | Meta ID: ${wamid}`,
      { id: 'meta-webhook', name: 'Meta Webhook', role: 'SYSTEM' }
    );

    return { updated: true, status: 'DELIVERED' };
  }

  if (rawStatus === 'read') {
    db.prepare(`
      UPDATE whatsapp_notifications
      SET status = 'READ',
          read_at = ?,
          delivered_at = COALESCE(delivered_at, ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(timestamp, timestamp, notification.id);

    logAuditEvent(
      'WHATSAPP_READ',
      `भाविकाने व्हॉट्सअ‍ॅप पावती उघडली/वाचली (READ): पावती ID: ${notification.receipt_id} | Meta ID: ${wamid}`,
      { id: 'meta-webhook', name: 'Meta Webhook', role: 'SYSTEM' }
    );

    return { updated: true, status: 'READ' };
  }

  if (rawStatus === 'failed') {
    const errorDetails = statusEvent.errors && statusEvent.errors[0]
      ? `${statusEvent.errors[0].title || ''} - ${statusEvent.errors[0].message || ''}`
      : 'Meta delivery failed';
    const errorCode = statusEvent.errors && statusEvent.errors[0]
      ? String(statusEvent.errors[0].code)
      : 'DELIVERY_FAILED';

    db.prepare(`
      UPDATE whatsapp_notifications
      SET status = 'FAILED',
          error_code = ?,
          error_message = ?,
          last_error_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(errorCode, errorDetails, timestamp, notification.id);

    logAuditEvent(
      'WHATSAPP_FAILED',
      `व्हॉट्सअ‍ॅप पावती डिलिव्हरी अयशस्वी: पावती ID: ${notification.receipt_id} | त्रुटी: ${errorDetails} (Code: ${errorCode})`,
      { id: 'meta-webhook', name: 'Meta Webhook', role: 'SYSTEM' }
    );

    return { updated: true, status: 'FAILED', error: errorDetails };
  }

  return { ignored: true, reason: `Unknown raw status: ${rawStatus}` };
}

/**
 * Triggers an authorized admin retry for an existing receipt notification.
 * Increments attempt count and resets dispatch lock.
 */
export async function retryNotification(receiptId, adminUser) {
  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
  if (!receipt) {
    const err = new Error('पावती सापडली नाही (Receipt not found).');
    err.status = 404;
    throw err;
  }

  let notification = db.prepare('SELECT * FROM whatsapp_notifications WHERE receipt_id = ?').get(receiptId);
  
  if (!notification) {
    // If no notification row was created yet, find matching contribution or create outbox entry
    const payment = db.prepare('SELECT * FROM upi_contributions WHERE receipt_id = ?').get(receiptId) || {
      id: crypto.randomUUID(),
      donor_mobile: receipt.donor_mobile
    };
    notification = createOutboxEntryTx(db, { payment, receipt });
  }

  // Reset to QUEUED and clear dispatch lock
  db.prepare(`
    UPDATE whatsapp_notifications
    SET status = 'QUEUED',
        dispatch_locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(notification.id);

  logAuditEvent(
    'WHATSAPP_RETRIED',
    `व्हॉट्सअ‍ॅप पावती पुन्हा पाठवण्याची विनंती (Retry): पावती क्र. ${receipt.receipt_no} द्वारे ${adminUser ? adminUser.name : 'Admin'}`,
    adminUser || { id: 'admin', name: 'Admin', role: 'ADMIN' }
  );

  // Trigger background dispatch
  triggerBackgroundDispatch(receiptId);

  return {
    success: true,
    message: 'व्हॉट्सअ‍ॅप पावती पुन्हा पाठवण्यासाठी शेड्यूल केली आहे (Retry queued).',
    notification: db.prepare('SELECT * FROM whatsapp_notifications WHERE id = ?').get(notification.id)
  };
}

/**
 * Retrieves the latest WhatsApp notification delivery status for a receipt.
 */
export function getReceiptNotificationStatus(receiptId) {
  if (!receiptId) return null;
  return db.prepare(`
    SELECT id, payment_id, receipt_id, recipient_phone, status, provider,
           meta_message_id, error_code, error_message, attempt_count,
           last_attempt_at, last_error_at, sent_at, delivered_at, read_at,
           created_at, updated_at
    FROM whatsapp_notifications
    WHERE receipt_id = ?
  `).get(receiptId) || null;
}
