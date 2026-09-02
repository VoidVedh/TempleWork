import crypto from 'crypto';
import db from '../config/database.js';
import { MANDAL_CONFIG } from '../config/mandalConfig.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const MARATHI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

function getMarathiDay(date) {
  const dayIndex = date.getDay();
  return `वार: ${MARATHI_WEEKDAYS[dayIndex]}`;
}

function buildUpiPayload({ upiId, payeeName, amount, intentRef }) {
  const pa = encodeURIComponent(upiId);
  const pn = encodeURIComponent(payeeName);
  const tn = encodeURIComponent(`Siddhivinayak Vargani ${intentRef}`);
  const formattedAmount = Number(amount).toFixed(2);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${formattedAmount}&cu=INR&tn=${tn}`;
}

export function getUpiConfig(req, res) {
  res.json({
    upi_id: MANDAL_CONFIG.upiId,
    payee_name: MANDAL_CONFIG.payeeName,
    payee_name_mr: MANDAL_CONFIG.payeeNameMr,
    mandal_name: MANDAL_CONFIG.mandalNameMr,
    location: MANDAL_CONFIG.locationMr
  });
}

/**
 * 1. INITIATE PAYMENT INTENT
 * Required: donor_name, donor_mobile (10 digits), amount (> 0)
 * Status: INITIATED (Never alters collections/receipts/balances)
 */
export function initiatePaymentIntent(req, res) {
  try {
    const { donor_name, donor_mobile, amount, notes, payment_app } = req.body;

    if (!donor_name || typeof donor_name !== 'string' || !donor_name.trim()) {
      return res.status(400).json({ error: 'कृपया दात्याचे पूर्ण नाव टाका (Donor full name is required).' });
    }

    const cleanName = donor_name.trim();
    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'कृपया वैध नाव टाका (Name too short).' });
    }

    if (!donor_mobile || typeof donor_mobile !== 'string') {
      return res.status(400).json({ error: 'कृपया 10-अंकी मोबाईल नंबर टाका (10-digit mobile number is required).' });
    }

    const cleanMobile = donor_mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'कृपया वैध 10-अंकी मोबाईल नंबर टाका (Valid 10-digit mobile required).' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'कृपया वैध वर्गणी रक्कम भरा (Amount must be greater than 0).' });
    }

    const currentYear = MANDAL_CONFIG.year || 2024;
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const intent_ref = `INT-${currentYear}-${randomSuffix}`;
    const id = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO upi_contributions (
        id, intent_ref, donor_name, donor_mobile, amount,
        upi_ref_no, payment_app, verification_status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INITIATED', ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      id,
      intent_ref,
      cleanName,
      cleanMobile,
      numAmount,
      intent_ref,
      payment_app || 'UPI',
      notes ? notes.trim() : ''
    );

    const created = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(id);

    // Audit Log: PAYMENT_INITIATED
    const actor = req.user || { id: 'public-donor', name: cleanName, name_mr: cleanName, role: 'DONOR' };
    logAuditEvent(
      'PAYMENT_INITIATED',
      `ऑनलाइन वर्गणी हेतू सुरू: संदर्भ क्र. ${intent_ref} | रक्कम: ₹${numAmount} | दाता: ${cleanName} (मो. ${cleanMobile})`,
      actor
    );

    const upiPayload = buildUpiPayload({
      upiId: MANDAL_CONFIG.upiId,
      payeeName: MANDAL_CONFIG.payeeName,
      amount: numAmount,
      intentRef: intent_ref
    });

    res.status(201).json({
      success: true,
      message: 'वर्गणी पेमेंट हेतू तयार झाला. कृपया UPI द्वारे रक्कम भरा.',
      intent: {
        id: created.id,
        intent_ref: created.intent_ref,
        donor_name: created.donor_name,
        donor_mobile: created.donor_mobile,
        amount: created.amount,
        upi_id: MANDAL_CONFIG.upiId,
        payee_name: MANDAL_CONFIG.payeeName,
        upi_payload: upiPayload,
        upi_link: upiPayload
      }
    });
  } catch (err) {
    console.error('Initiate payment intent error:', err);
    res.status(500).json({ error: 'Failed to initiate payment intent.' });
  }
}

/**
 * 2. SUBMIT UTR / TRANSACTION REFERENCE
 * Moves status from INITIATED -> PENDING_VERIFICATION
 * Enforces UTR uniqueness across all records
 * Never auto-verifies or creates a receipt
 */
export function submitUpiContribution(req, res) {
  try {
    const { intent_id, intent_ref, upi_ref_no, payment_app, notes, donor_name, donor_mobile, amount } = req.body;

    if (!upi_ref_no || typeof upi_ref_no !== 'string') {
      return res.status(400).json({ error: 'कृपया वैध UPI Transaction ID / UTR क्रमांक टाका.' });
    }

    const cleanUtr = upi_ref_no.trim();
    if (cleanUtr.length < 4 || cleanUtr.length > 30) {
      return res.status(400).json({ error: 'कृपया वैध UTR / Transaction ID टाका (4-30 characters).' });
    }

    // 1. Check duplicate UTR across all contributions
    const existingUtr = db.prepare('SELECT id, intent_ref, verification_status FROM upi_contributions WHERE upi_ref_no = ?').get(cleanUtr);
    if (existingUtr) {
      // If same intent is submitting same UTR again, handle gracefully or notify
      if ((intent_id && existingUtr.id === intent_id) || (intent_ref && existingUtr.intent_ref === intent_ref)) {
        return res.status(200).json({
          success: true,
          message: 'हा UTR आधीच नोंदवला आहे. पडताळणी प्रलंबित आहे.',
          contribution: db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(existingUtr.id)
        });
      }
      return res.status(400).json({
        error: 'हा Transaction ID / UTR आधीच वापरण्यात आला आहे (This UTR has already been registered).'
      });
    }

    // 2. Locate the intent
    let contribution = null;
    if (intent_id) {
      contribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(intent_id);
    } else if (intent_ref) {
      contribution = db.prepare('SELECT * FROM upi_contributions WHERE intent_ref = ?').get(intent_ref);
    }

    // If no intent exists (e.g. legacy direct submission fallback), create locked intent first
    if (!contribution) {
      if (!donor_name || !amount) {
        return res.status(400).json({ error: 'पेमेंट संदर्भ सापडला नाही. कृपया पुन्हा प्रयत्न करा.' });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'कृपया वैध वर्गणी रक्कम भरा.' });
      }

      const currentYear = MANDAL_CONFIG.year || 2024;
      const genRef = `INT-${currentYear}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const newId = crypto.randomUUID();

      db.prepare(`
        INSERT INTO upi_contributions (
          id, intent_ref, donor_name, donor_mobile, amount, upi_ref_no,
          payment_app, verification_status, notes, created_at, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_VERIFICATION', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        newId,
        genRef,
        donor_name.trim(),
        donor_mobile ? donor_mobile.replace(/\D/g, '') : '',
        numAmount,
        cleanUtr,
        payment_app || 'UPI',
        notes ? notes.trim() : ''
      );

      contribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(newId);
    } else {
      // Intent already found. Prevent re-submission if already VERIFIED or REJECTED
      if (contribution.verification_status === 'VERIFIED') {
        return res.status(400).json({ error: 'ही वर्गणी आधीच पडताळली गेली आहे व पावती तयार झाली आहे.' });
      }

      db.prepare(`
        UPDATE upi_contributions
        SET upi_ref_no = ?,
            payment_app = COALESCE(?, payment_app),
            notes = CASE WHEN ? != '' THEN ? ELSE notes END,
            verification_status = 'PENDING_VERIFICATION',
            submitted_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        cleanUtr,
        payment_app || 'UPI',
        notes ? notes.trim() : '',
        notes ? notes.trim() : '',
        contribution.id
      );

      contribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(contribution.id);
    }

    // Audit log: UTR_SUBMITTED
    const actor = req.user || { id: 'public-donor', name: contribution.donor_name, name_mr: contribution.donor_name, role: 'DONOR' };
    logAuditEvent(
      'UTR_SUBMITTED',
      `वर्गणी UTR सादर: संदर्भ: ${contribution.intent_ref} | ₹${contribution.amount} | दाता: ${contribution.donor_name} | UTR: ${cleanUtr} | ॲप: ${payment_app || 'UPI'}`,
      actor
    );

    res.status(200).json({
      success: true,
      message: 'आपली वर्गणी पडताळणीसाठी पाठवण्यात आली आहे. कृपया UTR क्रमांक जतन करून ठेवा.',
      contribution
    });
  } catch (err) {
    console.error('Submit UTR error:', err);
    res.status(500).json({ error: 'Failed to submit UTR reference.' });
  }
}

/**
 * 3. CHECK CONTRIBUTION STATUS (Public / Donor Friendly)
 */
export function checkContributionStatus(req, res) {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ error: 'कृपया संदर्भ क्रमांक, UTR किंवा मोबाईल नंबर टाका.' });
    }

    const clean = identifier.trim();

    // Try finding by intent_ref, upi_ref_no, id, or donor_mobile
    const contribution = db.prepare(`
      SELECT id, intent_ref, donor_name, donor_mobile, amount, upi_ref_no,
             payment_app, verification_status, receipt_id, notes,
             created_at, submitted_at, verified_at, rejection_reason
      FROM upi_contributions
      WHERE intent_ref = ? OR upi_ref_no = ? OR id = ? OR donor_mobile = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(clean, clean, clean, clean);

    if (!contribution) {
      return res.status(404).json({ error: 'कोणतीही वर्गणी नोंद सापडली नाही (No contribution record found).' });
    }

    let receipt = null;
    if (contribution.receipt_id) {
      receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(contribution.receipt_id);
    }

    res.json({
      contribution,
      receipt
    });
  } catch (err) {
    console.error('Check status error:', err);
    res.status(500).json({ error: 'Failed to check contribution status.' });
  }
}

/**
 * 4. LIST PENDING CONTRIBUTIONS (Admin Only)
 * Only returns records in PENDING_VERIFICATION state
 */
export function listPendingContributions(req, res) {
  try {
    const list = db.prepare(`
      SELECT * FROM upi_contributions
      WHERE verification_status = 'PENDING_VERIFICATION'
      ORDER BY submitted_at DESC, created_at DESC
    `).all();

    res.json({ pending_contributions: list });
  } catch (err) {
    console.error('List pending UPI error:', err);
    res.status(500).json({ error: 'Failed to retrieve pending UPI contributions.' });
  }
}

/**
 * 5. LIST ALL CONTRIBUTIONS (Authenticated User / Admin)
 */
export function listAllContributions(req, res) {
  try {
    const list = db.prepare(`
      SELECT * FROM upi_contributions
      ORDER BY created_at DESC
    `).all();

    res.json({ contributions: list });
  } catch (err) {
    console.error('List all UPI error:', err);
    res.status(500).json({ error: 'Failed to retrieve UPI contributions.' });
  }
}

/**
 * 6. VERIFY CONTRIBUTION (Admin Only - Atomic Server Transaction)
 * ONLY here is an official receipt created, money added to total, balance and leaderboard updated
 */
export function verifyContribution(req, res) {
  const verifyTx = db.transaction((contributionId, adminUser) => {
    // 1. Concurrency Check: ensure row is in PENDING_VERIFICATION state
    const contribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(contributionId);

    if (!contribution) {
      const err = new Error('UPI वर्गणी नोंद सापडली नाही.');
      err.status = 404;
      throw err;
    }

    if (contribution.verification_status === 'VERIFIED') {
      const err = new Error('ही वर्गणी आधीच पडताळली गेली आहे व पावती तयार झाली आहे.');
      err.status = 400;
      throw err;
    }

    if (contribution.verification_status !== 'PENDING_VERIFICATION') {
      const err = new Error(`ही वर्गणी प्रलंबित पडताळणी स्थितीत नाही (Current status: ${contribution.verification_status}).`);
      err.status = 400;
      throw err;
    }

    if (!contribution.upi_ref_no) {
      const err = new Error('या वर्गणीसाठी UTR / Transaction ID उपलब्ध नाही.');
      err.status = 400;
      throw err;
    }

    // 2. Generate Next Sequential Receipt Number
    const currentYear = MANDAL_CONFIG.year || 2024;
    const countRow = db.prepare('SELECT COUNT(*) as count FROM receipts').get();
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    const receipt_no = `EMM-${currentYear}-${nextSeq}`;

    const receiptId = crypto.randomUUID();
    const collector_id = adminUser.id;
    const collector_name = `${adminUser.name} (${adminUser.name_mr})`;
    const now = new Date();
    const marathi_day = getMarathiDay(now);
    const issue_date = now.toISOString();

    const paymentModeLabel = `UPI (${contribution.payment_app || 'Online'})`;
    const inWords = `Rupees ${Number(contribution.amount).toLocaleString('en-IN')} Only`;
    const receiptNotes = `UPI UTR: ${contribution.upi_ref_no} | संदर्भ: ${contribution.intent_ref || 'N/A'}${contribution.notes ? ' • ' + contribution.notes : ''}`;

    // 3. Create Official Paid Receipt
    db.prepare(`
      INSERT INTO receipts (
        id, receipt_no, donor_name, donor_mobile, address_galli,
        amount, amount_in_words, payment_mode, payment_status, 
        category_code, upi_ref_no, notes,
        collector_id, collector_name, issue_date, marathi_day, is_cancelled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Paid', ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      receiptId,
      receipt_no,
      contribution.donor_name,
      contribution.donor_mobile || '',
      contribution.address_galli || 'ऑनलाइन देणगी (Online UPI)',
      contribution.amount,
      inWords,
      paymentModeLabel,
      contribution.category_code || 'GANESHOTSAV_2024',
      contribution.upi_ref_no,
      receiptNotes,
      collector_id,
      collector_name,
      issue_date,
      marathi_day
    );

    // 4. Update contribution status to VERIFIED and link receipt_id
    db.prepare(`
      UPDATE upi_contributions
      SET verification_status = 'VERIFIED',
          receipt_id = ?,
          verified_at = CURRENT_TIMESTAMP,
          verified_by_id = ?,
          verified_by_name = ?
      WHERE id = ?
    `).run(
      receiptId,
      adminUser.id,
      collector_name,
      contributionId
    );

    // Sync Donors Table
    if (contribution.donor_mobile) {
      const cleanMob = contribution.donor_mobile.replace(/\D/g, '');
      const existingDonor = db.prepare('SELECT * FROM donors WHERE mobile = ?').get(cleanMob);
      if (existingDonor) {
        db.prepare(`
          UPDATE donors 
          SET name = ?, total_contributions = total_contributions + ?, contributions_count = contributions_count + 1, updated_at = CURRENT_TIMESTAMP
          WHERE mobile = ?
        `).run(contribution.donor_name, contribution.amount, cleanMob);
      } else {
        db.prepare(`
          INSERT INTO donors (id, name, mobile, address_galli, total_contributions, contributions_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(crypto.randomUUID(), contribution.donor_name, cleanMob, contribution.address_galli || '', contribution.amount);
      }
    }

    const createdReceipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
    const updatedContribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(contributionId);

    // 5. Audit Log: PAYMENT_VERIFIED & RECEIPT_CREATED
    logAuditEvent(
      'PAYMENT_VERIFIED',
      `UPI वर्गणी पडताळणी मंजूर: संदर्भ ${contribution.intent_ref} | पावती क्र. ${receipt_no} | ₹${contribution.amount} | दाता: ${contribution.donor_name} | UTR: ${contribution.upi_ref_no} द्वारे ${collector_name}`,
      adminUser
    );

    logAuditEvent(
      'CREATE_RECEIPT',
      `नवीन अधिकृत पावती जारी (UPI द्वारे): क्र. ${receipt_no} | ₹${contribution.amount} | दाता: ${contribution.donor_name}`,
      adminUser
    );

    return { receipt: createdReceipt, contribution: updatedContribution };
  });

  try {
    const { id } = req.params;
    const result = verifyTx(id, req.user);

    res.json({
      success: true,
      message: 'वर्गणी पडताळणी यशस्वी! अधिकृत पावती तयार झाली.',
      receipt: result.receipt,
      contribution: result.contribution
    });
  } catch (err) {
    console.error('Verify UPI contribution error:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Failed to verify UPI contribution.' });
  }
}

/**
 * 7. REJECT CONTRIBUTION (Admin Only - Atomic Server Transaction)
 */
export function rejectContribution(req, res) {
  const rejectTx = db.transaction((contributionId, adminUser, reason) => {
    const contribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(contributionId);

    if (!contribution) {
      const err = new Error('UPI वर्गणी नोंद सापडली नाही.');
      err.status = 404;
      throw err;
    }

    if (contribution.verification_status === 'VERIFIED') {
      const err = new Error('ही वर्गणी आधीच मंजूर झाली आहे, त्यामुळे अमान्य करता येणार नाही.');
      err.status = 400;
      throw err;
    }

    const cleanReason = reason && reason.trim() ? reason.trim() : 'बँक खात्यात रक्कम प्राप्त झालेली नाही किंवा चुकीचा UTR.';
    const collector_name = `${adminUser.name} (${adminUser.name_mr})`;

    db.prepare(`
      UPDATE upi_contributions
      SET verification_status = 'REJECTED',
          rejection_reason = ?,
          verified_at = CURRENT_TIMESTAMP,
          verified_by_id = ?,
          verified_by_name = ?
      WHERE id = ?
    `).run(
      cleanReason,
      adminUser.id,
      collector_name,
      contributionId
    );

    const updated = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(contributionId);

    // Audit log: PAYMENT_REJECTED
    logAuditEvent(
      'PAYMENT_REJECTED',
      `UPI वर्गणी अमान्य/रद्द: संदर्भ ${contribution.intent_ref || 'N/A'} | ₹${contribution.amount} | दाता: ${contribution.donor_name} | UTR: ${contribution.upi_ref_no || 'N/A'} | कारण: ${cleanReason} द्वारे ${collector_name}`,
      adminUser
    );

    return updated;
  });

  try {
    const { id } = req.params;
    const { reason } = req.body;
    const updated = rejectTx(id, req.user, reason);

    res.json({
      success: true,
      message: 'UPI वर्गणी अमान्य करण्यात आली.',
      contribution: updated
    });
  } catch (err) {
    console.error('Reject UPI contribution error:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Failed to reject UPI contribution.' });
  }
}

