import db from '../config/database.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export function getFinancialReports(req, res) {
  try {
    // 1. Paid collections (non-cancelled)
    const paidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
    `).get();

    // 2. Unpaid collections
    const unpaidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Unpaid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
    `).get();

    // 3. Expenses (non-cancelled and approved)
    const expRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL) AND (status = 'APPROVED' OR status IS NULL)
    `).get();

    const total_paid = paidRow.total;
    const total_unpaid = unpaidRow.total;
    const total_expenses = expRow.total;
    const net_balance = total_paid - total_expenses;

    // 4. Category breakdown
    const categoryStats = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL) AND (status = 'APPROVED' OR status IS NULL)
      GROUP BY category
      ORDER BY total DESC
    `).all();

    const category_breakdown = categoryStats.map(c => ({
      category: c.category,
      amount: c.total,
      count: c.count,
      percentage: total_expenses > 0 ? Math.round((c.total / total_expenses) * 100) : 0
    }));

    // 5. Payment modes distribution
    const paymentModeStats = db.prepare(`
      SELECT payment_mode, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM receipts
      WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
      GROUP BY payment_mode
      ORDER BY total DESC
    `).all();

    const payment_modes = paymentModeStats.map(p => ({
      payment_mode: p.payment_mode,
      amount: p.total,
      count: p.count,
      percentage: total_paid > 0 ? Math.round((p.total / total_paid) * 100) : 0
    }));

    res.json({
      summary: {
        total_paid,
        paid_count: paidRow.count,
        total_unpaid,
        unpaid_count: unpaidRow.count,
        total_expenses,
        expense_count: expRow.count,
        net_balance
      },
      category_breakdown,
      payment_modes
    });
  } catch (err) {
    console.error('Get financial reports error:', err);
    res.status(500).json({ error: 'Failed to generate financial reports.' });
  }
}

export function getCategoryBreakdown(req, res) {
  try {
    const expRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL) AND (status = 'APPROVED' OR status IS NULL)
    `).get();
    const total_expenses = expRow.total;

    const categoryStats = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL) AND (status = 'APPROVED' OR status IS NULL)
      GROUP BY category
      ORDER BY total DESC
    `).all();

    const categories = categoryStats.map(c => ({
      category: c.category,
      amount: c.total,
      count: c.count,
      percentage: total_expenses > 0 ? Math.round((c.total / total_expenses) * 100) : 0
    }));

    res.json({ categories });
  } catch (err) {
    console.error('Get category breakdown error:', err);
    res.status(500).json({ error: 'Failed to generate category breakdown.' });
  }
}

export function getPaymentModes(req, res) {
  try {
    const paidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
    `).get();
    const total_paid = paidRow.total;

    const paymentModeStats = db.prepare(`
      SELECT payment_mode, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM receipts
      WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
      GROUP BY payment_mode
      ORDER BY total DESC
    `).all();

    const payment_modes = paymentModeStats.map(p => ({
      payment_mode: p.payment_mode,
      amount: p.total,
      count: p.count,
      percentage: total_paid > 0 ? Math.round((p.total / total_paid) * 100) : 0
    }));

    res.json({ payment_modes });
  } catch (err) {
    console.error('Get payment modes error:', err);
    res.status(500).json({ error: 'Failed to generate payment modes.' });
  }
}

function escapeCsvCell(val) {
  let str = (val ?? '').toString();
  // Neutralize spreadsheet formula execution triggers (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportReceiptsCSV(req, res) {
  try {
    const receipts = db.prepare(`
      SELECT receipt_no, donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, upi_ref_no, payment_status, notes, collector_name, issue_date
      FROM receipts
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL)
      ORDER BY issue_date DESC
    `).all();

    let csvContent = 'पावती क्र. (Receipt No),दाता नाव (Donor Name),मोबाईल (Mobile),पत्ता (Address),रक्कम (Amount),अक्षरी (In Words),पेमेंट मोड (Payment Mode),UTR/Ref,स्थिती (Status),नोंद (Notes),कार्यकर्ता (Collector),दिनांक (Issue Date)\n';

    receipts.forEach(r => {
      csvContent += `${escapeCsvCell(r.receipt_no)},${escapeCsvCell(r.donor_name)},${escapeCsvCell(r.donor_mobile)},${escapeCsvCell(r.address_galli)},${r.amount},${escapeCsvCell(r.amount_in_words)},${escapeCsvCell(r.payment_mode)},${escapeCsvCell(r.upi_ref_no || '')},${escapeCsvCell(r.payment_status)},${escapeCsvCell(r.notes)},${escapeCsvCell(r.collector_name)},${escapeCsvCell(r.issue_date)}\n`;
    });

    logAuditEvent(
      'EXPORT_REPORT',
      `पावत्या CSV अहवाल डाउनलोड केला (Total ${receipts.length} records)`,
      req.user
    );

    const filename = `Siddhivinayak_Mandir_Receipts_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent); // Include BOM for Excel Marathi/Devanagari UTF-8 support
  } catch (err) {
    console.error('Export receipts CSV error:', err);
    res.status(500).json({ error: 'Failed to export receipts CSV.' });
  }
}

export function exportExpensesCSV(req, res) {
  try {
    const expenses = db.prepare(`
      SELECT voucher_no, title, category, amount, paid_to, payment_method, authorized_by, recorder_name, expense_date, reason
      FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL) AND (status = 'APPROVED' OR status IS NULL)
      ORDER BY expense_date DESC
    `).all();

    let csvContent = 'व्हाउचर क्र. (Voucher No),खर्चाचे नाव (Title),वर्गवारी (Category),रक्कम (Amount),कोणाला दिले (Paid To),पेमेंट पद्धत (Payment Method),अधिकार (Authorized By),नोंदणीकर्ता (Recorded By),तारीख (Date),कारण (Reason)\n';

    expenses.forEach(e => {
      csvContent += `${escapeCsvCell(e.voucher_no)},${escapeCsvCell(e.title)},${escapeCsvCell(e.category)},${e.amount},${escapeCsvCell(e.paid_to)},${escapeCsvCell(e.payment_method)},${escapeCsvCell(e.authorized_by)},${escapeCsvCell(e.recorder_name)},${escapeCsvCell(e.expense_date)},${escapeCsvCell(e.reason)}\n`;
    });

    logAuditEvent(
      'EXPORT_REPORT',
      `खर्च CSV अहवाल डाउनलोड केला (Total ${expenses.length} records)`,
      req.user
    );

    const filename = `Siddhivinayak_Mandir_Expenses_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    console.error('Export expenses CSV error:', err);
    res.status(500).json({ error: 'Failed to export expenses CSV.' });
  }
}

export function exportAuditLogsCSV(req, res) {
  try {
    const logs = db.prepare(`
      SELECT id, action, details, user_name, user_role, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 1000
    `).all();

    let csvContent = 'आयडी (ID),क्रिया (Action),तपशील (Details),वापरकर्ता (User),भूमिका (Role),वेळ (Timestamp)\n';

    logs.forEach(l => {
      csvContent += `${escapeCsvCell(l.id)},${escapeCsvCell(l.action)},${escapeCsvCell(l.details)},${escapeCsvCell(l.user_name)},${escapeCsvCell(l.user_role)},${escapeCsvCell(l.created_at)}\n`;
    });

    logAuditEvent(
      'EXPORT_REPORT',
      `ऑडिट लॉग CSV अहवाल डाउनलोड केला (Total ${logs.length} records)`,
      req.user
    );

    const filename = `Siddhivinayak_Mandir_AuditLogs_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    console.error('Export audit logs CSV error:', err);
    res.status(500).json({ error: 'Failed to export audit logs CSV.' });
  }
}

