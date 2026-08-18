import crypto from 'crypto';
import db from '../config/database.js';
import { MANDAL_CONFIG } from '../config/mandalConfig.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const MARATHI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

function getMarathiDay(date) {
  const dayIndex = date.getDay();
  return `वार: ${MARATHI_WEEKDAYS[dayIndex]}`;
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

export function submitUpiContribution(req, res) {
  try {
    const { donor_name, donor_mobile, amount, upi_ref_no, payment_app, notes } = req.body;

    if (!donor_name || !amount || !upi_ref_no) {
      return res.status(400).json({ error: 'दात्याचे नाव, रक्कम आणि UTR / Reference No. आवश्यक आहेत.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'कृपया वैध वर्गणी रक्कम भरा (Amount must be greater than 0).' });
    }

    const cleanUtr = upi_ref_no.trim();
    if (cleanUtr.length < 4) {
      return res.status(400).json({ error: 'कृपया वैध UTR / Transaction ID टाका.' });
    }

    // Check duplicate UTR
    const existing = db.prepare('SELECT id FROM upi_contributions WHERE upi_ref_no = ?').get(cleanUtr);
    if (existing) {
      return res.status(400).json({ error: 'हा Transaction ID / UTR आधीच सादर करण्यात आला आहे (This UTR has already been submitted).' });
    }

    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO upi_contributions (id, donor_name, donor_mobile, amount, upi_ref_no, payment_app, verification_status, notes, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      id,
      donor_name.trim(),
      donor_mobile ? donor_mobile.trim() : '',
      numAmount,
      cleanUtr,
      payment_app || 'UPI App',
      notes ? notes.trim() : ''
    );

    const created = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(id);

    // Audit log
    const actor = req.user || { id: 'public-donor', name: donor_name, name_mr: donor_name, role: 'DONOR' };
    logAuditEvent(
      'UPI_UTR_SUBMITTED',
      `वर्गणी UTR सादर: ₹${numAmount} | दात्याचे नाव: ${donor_name.trim()} | UTR: ${cleanUtr} | ॲप: ${payment_app || 'UPI'}`,
      actor
    );

    res.status(201).json({
      success: true,
      message: 'वर्गणी नोंद यशस्वी! अध्यक्षांच्या पडताळणीनंतर अधिकृत पावती तयार होईल.',
      contribution: created
    });
  } catch (err) {
    console.error('Submit UPI error:', err);
    res.status(500).json({ error: 'Failed to submit UPI contribution reference.' });
  }
}

export function listPendingContributions(req, res) {
  try {
    const list = db.prepare(`
      SELECT * FROM upi_contributions
      WHERE verification_status = 'PENDING'
      ORDER BY submitted_at DESC
    `).all();

    res.json({ pending_contributions: list });
  } catch (err) {
    console.error('List pending UPI error:', err);
    res.status(500).json({ error: 'Failed to retrieve pending UPI contributions.' });
  }
}

export function listAllContributions(req, res) {
  try {
    const list = db.prepare(`
      SELECT * FROM upi_contributions
      ORDER BY submitted_at DESC
    `).all();

    res.json({ contributions: list });
  } catch (err) {
    console.error('List all UPI error:', err);
    res.status(500).json({ error: 'Failed to retrieve UPI contributions.' });
  }
}

export function verifyContribution(req, res) {
  try {
    const { id } = req.params;
    const contribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(id);

    if (!contribution) {
      return res.status(404).json({ error: 'UPI नोंद सापडली नाही.' });
    }

    if (contribution.verification_status === 'VERIFIED') {
      return res.status(400).json({ error: 'ही वर्गणी आधीच पडताळली गेली आहे.' });
    }

    // Auto-generate official receipt
    const currentYear = 2024;
    const countRow = db.prepare('SELECT COUNT(*) as count FROM receipts').get();
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    const receipt_no = `EMM-${currentYear}-${nextSeq}`;

    const receiptId = crypto.randomUUID();
    const collector_id = req.user.id;
    const collector_name = `${req.user.name} (${req.user.name_mr})`;
    const now = new Date();
    const marathi_day = getMarathiDay(now);
    const issue_date = now.toISOString();

    const paymentModeLabel = `UPI (${contribution.payment_app || 'Online'})`;
    const inWords = `Rupees ${contribution.amount.toLocaleString('en-IN')} Only`;

    // 1. Insert official receipt
    db.prepare(`
      INSERT INTO receipts (id, receipt_no, donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, notes, collector_id, collector_name, issue_date, marathi_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Paid', ?, ?, ?, ?, ?)
    `).run(
      receiptId,
      receipt_no,
      contribution.donor_name,
      contribution.donor_mobile || '',
      'ऑनलाइन देणगी (Online UPI)',
      contribution.amount,
      inWords,
      paymentModeLabel,
      `UPI UTR: ${contribution.upi_ref_no}${contribution.notes ? ' • ' + contribution.notes : ''}`,
      collector_id,
      collector_name,
      issue_date,
      marathi_day
    );

    // 2. Update contribution state to VERIFIED and link receipt
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
      req.user.id,
      collector_name,
      id
    );

    const createdReceipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
    const updatedContribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(id);

    // Audit log
    logAuditEvent(
      'UPI_CONTRIBUTION_VERIFIED',
      `UPI वर्गणी पडताळणी पूर्ण: क्र. ${receipt_no} | ₹${contribution.amount} | दात्याचे नाव: ${contribution.donor_name} | UTR: ${contribution.upi_ref_no} द्वारे ${collector_name}`,
      req.user
    );

    res.json({
      success: true,
      message: 'वर्गणी पडताळणी यशस्वी! अधिकृत पावती तयार झाली.',
      receipt: createdReceipt,
      contribution: updatedContribution
    });
  } catch (err) {
    console.error('Verify UPI contribution error:', err);
    res.status(500).json({ error: 'Failed to verify UPI contribution.' });
  }
}

export function rejectContribution(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const contribution = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(id);

    if (!contribution) {
      return res.status(404).json({ error: 'UPI नोंद सापडली नाही.' });
    }

    db.prepare(`
      UPDATE upi_contributions
      SET verification_status = 'REJECTED',
          rejection_reason = ?,
          verified_at = CURRENT_TIMESTAMP,
          verified_by_id = ?,
          verified_by_name = ?
      WHERE id = ?
    `).run(
      reason || 'बँक खात्यात रक्कम प्राप्त झालेली नाही किंवा चुकीचा UTR.',
      req.user.id,
      `${req.user.name} (${req.user.name_mr})`,
      id
    );

    const updated = db.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(id);

    // Audit log
    logAuditEvent(
      'UPI_CONTRIBUTION_REJECTED',
      `UPI वर्गणी अमान्य/रद्द: ₹${contribution.amount} | दात्याचे नाव: ${contribution.donor_name} | UTR: ${contribution.upi_ref_no} | कारण: ${reason || 'Unmatched'} द्वारे ${req.user.name}`,
      req.user
    );

    res.json({
      success: true,
      message: 'UPI वर्गणी अमान्य करण्यात आली.',
      contribution: updated
    });
  } catch (err) {
    console.error('Reject UPI contribution error:', err);
    res.status(500).json({ error: 'Failed to reject UPI contribution.' });
  }
}
