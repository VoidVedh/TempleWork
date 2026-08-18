import db from '../config/database.js';

export function getDashboardStats(req, res) {
  try {
    // 1. Paid collection stats
    const paidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid'
    `).get();

    // 2. Today paid collection
    const today = new Date().toISOString().split('T')[0];
    const todayPaidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid' AND DATE(issue_date) = DATE(?)
    `).get(today);

    // 3. Unpaid / Pending collection stats
    const unpaidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Unpaid'
    `).get();

    // 4. Expenses stats
    const expRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses
    `).get();

    // 5. Today expenses
    const todayExpRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE DATE(expense_date) = DATE(?)
    `).get(today);

    const total_paid = paidRow.total;
    const paid_count = paidRow.count;
    const total_unpaid = unpaidRow.total;
    const unpaid_count = unpaidRow.count;
    const total_expenses = expRow.total;
    const expense_count = expRow.count;
    const net_balance = total_paid - total_expenses;

    // Budget utilization
    const budget_total = total_paid > 0 ? total_paid : 0;
    const budget_used_pct = budget_total > 0 ? Math.min(100, Math.round((total_expenses / budget_total) * 100)) : 0;
    const budget_remaining_pct = Math.max(0, 100 - budget_used_pct);

    // Recent 5 receipts
    const recent_receipts = db.prepare(`
      SELECT * FROM receipts
      ORDER BY issue_date DESC, rowid DESC
      LIMIT 5
    `).all();

    // Recent 5 expenses
    const recent_expenses = db.prepare(`
      SELECT * FROM expenses
      ORDER BY expense_date DESC, created_at DESC
      LIMIT 5
    `).all();

    res.json({
      stats: {
        total_paid,
        paid_count,
        today_paid: todayPaidRow.total,
        total_unpaid,
        unpaid_count,
        total_expenses,
        expense_count,
        today_expenses: todayExpRow.total,
        net_balance,
        budget_total,
        budget_used_pct,
        budget_remaining_pct
      },
      recent_receipts,
      recent_expenses
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard stats.' });
  }
}
