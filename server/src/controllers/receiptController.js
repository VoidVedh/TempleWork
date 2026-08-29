import db from '../config/database.js';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/auditLogger.js';

const MARATHI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

function getMarathiDay(date) {
  const dayIndex = date.getDay();
  return `वार: ${MARATHI_WEEKDAYS[dayIndex]}`;
}

function syncDonorEntity(name, mobile, address_galli, amount, isPaid) {
  if (!mobile || !name) return;
  const cleanMobile = mobile.replace(/\D/g, '');
  if (cleanMobile.length < 10) return;

  const existing = db.prepare('SELECT * FROM donors WHERE mobile = ?').get(cleanMobile);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE donors
      SET name = COALESCE(?, name),
          address_galli = COALESCE(?, address_galli),
          total_contributions = total_contributions + ?,
          contributions_count = contributions_count + ?,
          updated_at = ?
      WHERE mobile = ?
    `).run(
      name.trim(),
      address_galli ? address_galli.trim() : null,
      isPaid ? amount : 0,
      isPaid ? 1 : 0,
      now,
      cleanMobile
    );
  } else {
    db.prepare(`
      INSERT INTO donors (id, name, mobile, address_galli, total_contributions, contributions_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      name.trim(),
      cleanMobile,
      address_galli ? address_galli.trim() : '',
      isPaid ? amount : 0,
      isPaid ? 1 : 0,
      now,
      now
    );
  }
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

    // Auto-generate receipt number: EMM-2024-XXXX
    const currentYear = 2024;
    const countRow = db.prepare('SELECT COUNT(*) as count FROM receipts').get();
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    const receipt_no = `EMM-${currentYear}-${nextSeq}`;

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
    const { status, search } = req.query;
    let query = 'SELECT * FROM receipts WHERE (is_cancelled = 0 OR is_cancelled IS NULL)';
    const params = [];

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

    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    db.prepare('UPDATE receipts SET payment_status = ? WHERE id = ?').run(payment_status, id);
    const updated = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);

    // Sync donor
    if (receipt.donor_mobile) {
      syncDonorEntity(receipt.donor_name, receipt.donor_mobile, receipt.address_galli, receipt.amount, payment_status === 'Paid');
    }

    logAuditEvent(
      'UPDATE_RECEIPT_STATUS',
      `पावती स्थिती बदलली: क्र. ${receipt.receipt_no} -> ${payment_status === 'Paid' ? 'जमा (Paid)' : 'पेंडींग (Unpaid)'}`,
      req.user
    );

    res.json({ receipt: updated });
  } catch (err) {
    console.error('Update receipt status error:', err);
    res.status(500).json({ error: 'Failed to update receipt status.' });
  }
}

export function cancelReceipt(req, res) {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    db.prepare(`
      UPDATE receipts 
      SET is_cancelled = 1, cancellation_reason = ? 
      WHERE id = ?
    `).run(cancellation_reason || 'Cancelled by authorized administrator', id);

    logAuditEvent(
      'CANCEL_RECEIPT',
      `पावती रद्द केली: क्र. ${receipt.receipt_no} | रक्कम: ₹${receipt.amount} | कारण: ${cancellation_reason || 'कार्यालयीन आदेश'}`,
      req.user
    );

    res.json({ success: true, message: `पावती क्र. ${receipt.receipt_no} रद्द करण्यात आली आहे.` });
  } catch (err) {
    console.error('Cancel receipt error:', err);
    res.status(500).json({ error: 'Failed to cancel receipt.' });
  }
}
