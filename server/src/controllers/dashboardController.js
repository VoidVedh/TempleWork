import db from '../config/database.js';

function maskMobile(mobile) {
  if (!mobile || mobile.length < 6) return '';
  const clean = mobile.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 2)}****${clean.slice(6)}`;
  }
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}

export function getPublicStats(req, res) {
  try {
    // 1. STRICT Financial Integrity Rule: Only count verified, non-cancelled paid receipts
    const verifiedRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
    `).get();

    // 2. Active Campaigns with verified progress
    const campaigns = db.prepare(`
      SELECT c.*, 
        COALESCE((
          SELECT SUM(r.amount) 
          FROM receipts r 
          WHERE (r.category_code = c.category_code OR (c.category_code = 'GANESHOTSAV_2024' AND r.category_code IS NULL))
            AND r.payment_status = 'Paid' 
            AND (r.is_cancelled = 0 OR r.is_cancelled IS NULL)
        ), 0) as collected_amount
      FROM campaigns c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.created_at ASC
    `).all();

    // 3. Recent Verified Donors for Public Honor Roll (safe masked data)
    const recentDonors = db.prepare(`
      SELECT id, receipt_no, donor_name, donor_mobile, amount, payment_mode, issue_date, marathi_day
      FROM receipts
      WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
      ORDER BY issue_date DESC, rowid DESC
      LIMIT 15
    `).all().map(d => ({
      receipt_no: d.receipt_no,
      donor_name: d.donor_name,
      masked_mobile: maskMobile(d.donor_mobile),
      amount: d.amount,
      payment_mode: d.payment_mode,
      issue_date: d.issue_date,
      marathi_day: d.marathi_day
    }));

    res.json({
      verified_total_collection: verifiedRow.total,
      verified_donors_count: verifiedRow.count,
      campaigns,
      recent_donors: recentDonors
    });
  } catch (err) {
    console.error('Get public stats error:', err);
    res.status(500).json({ error: 'Failed to compute public temple stats.' });
  }
}

export function getPublicCampaigns(req, res) {
  try {
    const campaigns = db.prepare(`
      SELECT c.*, 
        COALESCE((
          SELECT SUM(r.amount) 
          FROM receipts r 
          WHERE (r.category_code = c.category_code OR (c.category_code = 'GANESHOTSAV_2024' AND r.category_code IS NULL))
            AND r.payment_status = 'Paid' 
            AND (r.is_cancelled = 0 OR r.is_cancelled IS NULL)
        ), 0) as collected_amount
      FROM campaigns c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.created_at ASC
    `).all();

    res.json({ campaigns });
  } catch (err) {
    console.error('Get public campaigns error:', err);
    res.status(500).json({ error: 'Failed to load campaigns.' });
  }
}

export function getDashboardStats(req, res) {
  try {
    // 1. Paid collection stats (strict financial integrity: non-cancelled)
    const paidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
    `).get();

    // 2. Today paid collection
    const today = new Date().toISOString().split('T')[0];
    const todayPaidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Paid' 
        AND (is_cancelled = 0 OR is_cancelled IS NULL)
        AND DATE(issue_date) = DATE(?)
    `).get(today);

    // 3. Unpaid / Pending collection stats
    const unpaidRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE payment_status = 'Unpaid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
    `).get();

    // 4. Approved Expenses stats
    const expRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL)
        AND (status = 'APPROVED' OR status IS NULL)
    `).get();

    // 5. Today expenses
    const todayExpRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL)
        AND (status = 'APPROVED' OR status IS NULL)
        AND DATE(expense_date) = DATE(?)
    `).get(today);

    // 6. Pending UPI Contributions count
    const pendingUpiRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM upi_contributions
      WHERE verification_status = 'PENDING_VERIFICATION'
    `).get();

    const total_paid = paidRow.total;
    const paid_count = paidRow.count;
    const total_unpaid = unpaidRow.total;
    const unpaid_count = unpaidRow.count;
    const total_expenses = expRow.total;
    const expense_count = expRow.count;
    const net_balance = total_paid - total_expenses;
    const pending_upi_count = pendingUpiRow.count;

    // Budget utilization
    const budget_total = total_paid > 0 ? total_paid : 0;
    const budget_used_pct = budget_total > 0 ? Math.min(100, Math.round((total_expenses / budget_total) * 100)) : 0;
    const budget_remaining_pct = Math.max(0, 100 - budget_used_pct);

    // Recent 5 receipts
    const recent_receipts = db.prepare(`
      SELECT * FROM receipts
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL)
      ORDER BY issue_date DESC, rowid DESC
      LIMIT 5
    `).all();

    // Recent 5 expenses
    const recent_expenses = db.prepare(`
      SELECT * FROM expenses
      WHERE (is_cancelled = 0 OR is_cancelled IS NULL)
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
        pending_upi_count,
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
