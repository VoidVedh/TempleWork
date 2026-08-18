import db from '../config/database.js';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/auditLogger.js';

const MARATHI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

function getMarathiDay(date) {
  const dayIndex = date.getDay();
  return `वार: ${MARATHI_WEEKDAYS[dayIndex]}`;
}

export function createReceipt(req, res) {
  try {
    const { donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, notes } = req.body;

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
      INSERT INTO receipts (id, receipt_no, donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, notes, collector_id, collector_name, issue_date, marathi_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      notes ? notes.trim() : '',
      collector_id,
      collector_name,
      issue_date,
      marathi_day
    );

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
    let query = 'SELECT * FROM receipts WHERE 1=1';
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
