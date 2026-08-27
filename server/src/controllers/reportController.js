import db from '../config/database.js';

export function getFinancialReports(req, res) {
  try {
    // 1. Paid collections
    const paidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid'
    `).get();

    // 2. Unpaid collections
    const unpaidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Unpaid'
    `).get();

    // 3. Expenses
    const expRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses
    `).get();

    const total_paid = paidRow.total;
    const total_unpaid = unpaidRow.total;
    const total_expenses = expRow.total;
    const net_balance = total_paid - total_expenses;

    // 4. Category breakdown
    const categoryStats = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
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
      WHERE payment_status = 'Paid'
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

export function exportReceiptsCSV(req, res) {
  try {
    const receipts = db.prepare(`
      SELECT receipt_no, donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, notes, collector_name, issue_date
      FROM receipts
      ORDER BY issue_date DESC
    `).all();

    let csvContent = 'पावती क्र. (Receipt No),दाता नाव (Donor Name),मोबाईल (Mobile),पत्ता (Address),रक्कम (Amount),अक्षरी (In Words),पेमेंट मोड (Payment Mode),स्थिती (Status),नोंद (Notes),कार्यकर्ता (Collector),दिनांक (Issue Date)\n';

    receipts.forEach(r => {
      const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      csvContent += `${escape(r.receipt_no)},${escape(r.donor_name)},${escape(r.donor_mobile)},${escape(r.address_galli)},${r.amount},${escape(r.amount_in_words)},${escape(r.payment_mode)},${escape(r.payment_status)},${escape(r.notes)},${escape(r.collector_name)},${escape(r.issue_date)}\n`;
    });

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
      ORDER BY expense_date DESC
    `).all();

    let csvContent = 'व्हाउचर क्र. (Voucher No),खर्चाचे नाव (Title),वर्गवारी (Category),रक्कम (Amount),कोणाला दिले (Paid To),पेमेंट पद्धत (Payment Method),अधिकार (Authorized By),नोंदणीकर्ता (Recorded By),तारीख (Date),कारण (Reason)\n';

    expenses.forEach(e => {
      const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      csvContent += `${escape(e.voucher_no)},${escape(e.title)},${escape(e.category)},${e.amount},${escape(e.paid_to)},${escape(e.payment_method)},${escape(e.authorized_by)},${escape(e.recorder_name)},${escape(e.expense_date)},${escape(e.reason)}\n`;
    });

    const filename = `Siddhivinayak_Mandir_Expenses_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    console.error('Export expenses CSV error:', err);
    res.status(500).json({ error: 'Failed to export expenses CSV.' });
  }
}
