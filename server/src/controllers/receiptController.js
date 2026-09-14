import db from '../config/database.js';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/auditLogger.js';

const MARATHI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

function getMarathiDay(date) {
  const dayIndex = date.getDay();
  return `वार: ${MARATHI_WEEKDAYS[dayIndex]}`;
}

function syncDonorEntity(name, mobile, address_galli, amountDelta, isPaid, countDelta = null) {
  if (!mobile || !name) return;
  const cleanMobile = mobile.replace(/\D/g, '');
  if (cleanMobile.length < 10) return;

  const existing = db.prepare('SELECT * FROM donors WHERE mobile = ?').get(cleanMobile);
  const now = new Date().toISOString();
  const numDelta = isPaid ? parseFloat(amountDelta) || 0 : 0;
  const numCountDelta = countDelta !== null ? countDelta : (isPaid ? 1 : 0);

  if (existing) {
    db.prepare(`
      UPDATE donors
      SET name = COALESCE(?, name),
          address_galli = COALESCE(?, address_galli),
          total_contributions = MAX(0, total_contributions + ?),
          contributions_count = MAX(0, contributions_count + ?),
          updated_at = ?
      WHERE mobile = ?
    `).run(
      name.trim(),
      address_galli ? address_galli.trim() : null,
      numDelta,
      numCountDelta,
      now,
      cleanMobile
    );
  } else if (isPaid && numDelta > 0) {
    db.prepare(`
      INSERT INTO donors (id, name, mobile, address_galli, total_contributions, contributions_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      name.trim(),
      cleanMobile,
      address_galli ? address_galli.trim() : '',
      numDelta,
      Math.max(1, numCountDelta),
      now,
      now
    );
  }
}

export function generateReceiptNumber(database, currentYear) {
  const row = database.prepare(`
    SELECT MAX(CAST(SUBSTR(receipt_no, 10) AS INTEGER)) as maxNum 
    FROM receipts 
    WHERE receipt_no LIKE ?
  `).get(`EMM-${currentYear}-%`);
  const next = (row?.maxNum || 0) + 1;
  return `EMM-${currentYear}-${String(next).padStart(4, '0')}`;
}

export function createReceipt(req, res) {
  try {
    const { donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, category_code, notes } = req.body;

    if (!donor_name || !amount) {
      return res.status(400).json({ error: 'दात्याचे नाव आणि रक्कम आवश्यक आहे (Donor name and amount are required).' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'अवैध रक्कम (Invalid amount).' });
    }

    // Auto-generate receipt number: EMM-YYYY-XXXX (B1: Dynamic year, B2: MAX() sequential number)
    const currentYear = new Date().getFullYear();
    const receipt_no = generateReceiptNumber(db, currentYear);

    const id = crypto.randomUUID();
    const collector_id = req.user.id;
    const collector_name = `${req.user.name} (${req.user.name_mr})`;
    const now = new Date();
    const marathi_day = getMarathiDay(now);
    const issue_date = now.toISOString();

    const stmt = db.prepare(`
      INSERT INTO receipts (
        id, receipt_no, donor_name, donor_mobile, address_galli, 
        amount, amount_in_words, payment_mode, payment_status, 
        category_code, notes, collector_id, collector_name, issue_date, marathi_day, is_cancelled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(
      id,
      receipt_no,
      donor_name.trim(),
      donor_mobile ? donor_mobile.trim() : '',
      address_galli ? address_galli.trim() : '',
      numAmount,
      amount_in_words || `Rupees ${numAmount} Only`,
      payment_mode || 'Cash',
      payment_status || 'Paid',
      category_code || 'GANESHOTSAV_2024',
      notes ? notes.trim() : '',
      collector_id,
      collector_name,
      issue_date,
      marathi_day
    );

    // Sync donor entity
    if (donor_mobile) {
      syncDonorEntity(donor_name, donor_mobile, address_galli, numAmount, payment_status === 'Paid');
    }

    const createdReceipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);

    // Audit Log
    const statusText = payment_status === 'Paid' ? '(जमा/Paid)' : '(येणे बाकी/Unpaid)';
    const auditDesc = `पावती तयार केली: क्र. ${receipt_no} | ₹${numAmount} | ${donor_name} ${statusText} जमाकर्ता: ${collector_name}`;
    logAuditEvent('CREATE_RECEIPT', auditDesc, req.user);

    res.status(201).json({ receipt: createdReceipt });
  } catch (err) {
    console.error('Create receipt error:', err);
    res.status(500).json({ error: 'Failed to generate receipt.' });
  }
}

export function listReceipts(req, res) {
  try {
    const { status, search, donor_mobile, limit } = req.query;
    let query = 'SELECT * FROM receipts WHERE (is_cancelled = 0 OR is_cancelled IS NULL)';
    const params = [];

    const isStaffOrAdmin = req.user && (
      req.user.role === 'ADMIN' || 
      req.user.role === 'SUPER_ADMIN' || 
      req.user.role === 'TREASURER' || 
      req.user.can_change_payment_status === 1
    );

    if (!isStaffOrAdmin) {
      // Non-admin / devotee callers can strictly only access receipts for their own mobile or that they collected
      const userMobile = req.user?.mobile ? req.user.mobile.replace(/\D/g, '') : '';
      if (donor_mobile) {
        const reqMobile = donor_mobile.replace(/\D/g, '');
        if (reqMobile !== userMobile) {
          return res.status(403).json({ error: 'अनधिकृत विनंती (Unauthorized: cannot view other donors receipts).' });
        }
      }
      query += ' AND (donor_mobile = ? OR collector_id = ?)';
      params.push(userMobile, req.user?.id || '');
    } else if (donor_mobile) {
      const cleanMob = donor_mobile.replace(/\D/g, '');
      query += ' AND donor_mobile = ?';
      params.push(cleanMob);
    }

    if (status && status !== 'all') {
      query += ' AND payment_status = ?';
      params.push(status === 'unpaid' ? 'Unpaid' : 'Paid');
    }

    if (search) {
      query += ' AND (donor_name LIKE ? OR receipt_no LIKE ? OR donor_mobile LIKE ? OR address_galli LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY issue_date DESC';

    const numLimit = parseInt(limit, 10);
    if (!isNaN(numLimit) && numLimit > 0) {
      query += ' LIMIT ?';
      params.push(numLimit);
    }

    const receipts = db.prepare(query).all(...params);
    res.json({ receipts });
  } catch (err) {
    console.error('List receipts error:', err);
    res.status(500).json({ error: 'Failed to fetch receipts.' });
  }
}

export function getReceiptById(req, res) {
  try {
    const { id } = req.params;
    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ? OR receipt_no = ?').get(id, id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }
    res.json({ receipt });
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ error: 'Failed to retrieve receipt.' });
  }
}

export function searchPublicReceipts(req, res) {
  try {
    const { receipt_no, mobile } = req.query;

    if (!receipt_no && !mobile) {
      return res.status(400).json({ error: 'कृपया पावती क्रमांक किंवा मोबाईल नंबर टाका (Please provide receipt number or mobile number).' });
    }

    let query = 'SELECT * FROM receipts WHERE payment_status = \'Paid\' AND (is_cancelled = 0 OR is_cancelled IS NULL)';
    const params = [];

    if (receipt_no && mobile) {
      const cleanMob = mobile.replace(/\D/g, '');
      query += ' AND (receipt_no = ? OR id = ?) AND donor_mobile LIKE ?';
      params.push(receipt_no.trim(), receipt_no.trim(), `%${cleanMob}%`);
    } else if (receipt_no) {
      query += ' AND (receipt_no = ? OR id = ?)';
      params.push(receipt_no.trim(), receipt_no.trim());
    } else if (mobile) {
      const cleanMob = mobile.replace(/\D/g, '');
      query += ' AND donor_mobile LIKE ?';
      params.push(`%${cleanMob}%`);
    }

    query += ' ORDER BY issue_date DESC LIMIT 10';

    const receipts = db.prepare(query).all(...params);

    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ error: 'कोणतीही पडताळलेली पावती आढळली नाही (No verified receipt found matching criteria).' });
    }

    res.json({ receipts });
  } catch (err) {
    console.error('Search public receipts error:', err);
    res.status(500).json({ error: 'Failed to search receipts.' });
  }
}

export function verifyPublicReceipt(req, res) {
  try {
    const { id } = req.params;
    const cleanId = id.trim();

    const receipt = db.prepare(`
      SELECT id, receipt_no, donor_name, amount, payment_mode, payment_status, issue_date, marathi_day, is_cancelled
      FROM receipts 
      WHERE id = ? OR receipt_no = ?
    `).get(cleanId, cleanId);

    if (!receipt) {
      return res.status(404).json({
        verified: false,
        error: 'ही पावती अधिकृत रेकॉर्डमध्ये आढळली नाही (This receipt is not found in official temple records).'
      });
    }

    if (receipt.is_cancelled) {
      return res.status(400).json({
        verified: false,
        status: 'CANCELLED',
        message: 'ही पावती रद्द करण्यात आली आहे (This receipt was cancelled).'
      });
    }

    res.json({
      verified: true,
      status: receipt.payment_status,
      receipt: {
        receipt_no: receipt.receipt_no,
        donor_name: receipt.donor_name,
        amount: receipt.amount,
        payment_mode: receipt.payment_mode,
        payment_status: receipt.payment_status,
        issue_date: receipt.issue_date,
        marathi_day: receipt.marathi_day
      }
    });
  } catch (err) {
    console.error('Verify public receipt error:', err);
    res.status(500).json({ error: 'Failed to verify receipt.' });
  }
}

export function updateReceiptStatus(req, res) {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!['Paid', 'Unpaid'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status.' });
    }

    const updateTx = db.transaction(() => {
      const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
      if (!receipt) {
        const err = new Error('Receipt not found.');
        err.status = 404;
        throw err;
      }

      const oldStatus = receipt.payment_status;
      db.prepare('UPDATE receipts SET payment_status = ? WHERE id = ?').run(payment_status, id);

      // B3: Prevent donor double-counting - sync only if payment status actually changed
      if (receipt.donor_mobile) {
        if (oldStatus !== 'Paid' && payment_status === 'Paid') {
          syncDonorEntity(receipt.donor_name, receipt.donor_mobile, receipt.address_galli, receipt.amount, true, 1);
        } else if (oldStatus === 'Paid' && payment_status !== 'Paid') {
          syncDonorEntity(receipt.donor_name, receipt.donor_mobile, receipt.address_galli, -receipt.amount, true, -1);
        }
      }

      return db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
    });

    const updated = updateTx();

    logAuditEvent(
      'UPDATE_RECEIPT_STATUS',
      `पावती स्थिती बदलली: क्र. ${updated.receipt_no} -> ${payment_status === 'Paid' ? 'जमा (Paid)' : 'पेंडींग (Unpaid)'}`,
      req.user
    );

    res.json({ receipt: updated });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    console.error('Update receipt status error:', err);
    res.status(500).json({ error: 'Failed to update receipt status.' });
  }
}

export function cancelReceipt(req, res) {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const cancelTx = db.transaction(() => {
      const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
      if (!receipt) {
        const err = new Error('Receipt not found.');
        err.status = 404;
        throw err;
      }

      if (receipt.is_cancelled === 1) {
        return receipt;
      }

      db.prepare(`
        UPDATE receipts 
        SET is_cancelled = 1, cancellation_reason = ? 
        WHERE id = ?
      `).run(cancellation_reason || 'Cancelled by authorized administrator', id);

      // If receipt was Paid, reverse its donor contribution
      if (receipt.payment_status === 'Paid' && receipt.donor_mobile) {
        syncDonorEntity(receipt.donor_name, receipt.donor_mobile, receipt.address_galli, -receipt.amount, true, -1);
      }

      return receipt;
    });

    const receipt = cancelTx();

    logAuditEvent(
      'CANCEL_RECEIPT',
      `पावती रद्द केली: क्र. ${receipt.receipt_no} | रक्कम: ₹${receipt.amount} | कारण: ${cancellation_reason || 'कार्यालयीन आदेश'}`,
      req.user
    );

    res.json({ success: true, message: `पावती क्र. ${receipt.receipt_no} रद्द करण्यात आली आहे.` });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    console.error('Cancel receipt error:', err);
    res.status(500).json({ error: 'Failed to cancel receipt.' });
  }
}
