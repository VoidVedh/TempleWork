import bcrypt from 'bcryptjs';
import db, { initDatabase } from '../config/database.js';

export function seedInitialData() {
  initDatabase();

  // Clear existing tables
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM expenses;
    DELETE FROM receipts;
    DELETE FROM users;
    DELETE FROM mandal_settings;
  `);

  // 1. Insert Mandal Settings
  const mandalStmt = db.prepare(`
    INSERT INTO mandal_settings (id, name_en, name_mr, location_en, location_mr, reg_no, year)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  mandalStmt.run(
    'mandal-1',
    'Shree Siddhivinayak Mandir',
    'श्री सिद्धिविनायक मंदिर',
    'Airoli Sector-5, Navi Mumbai 400708',
    'ऐरोली सेक्टर-५, नवी मुंबई ४००७०८',
    'MH/08/2026',
    2026
  );

  // 2. Insert Users with Synthetic Test Personas
  const userStmt = db.prepare(`
    INSERT INTO users (id, username, name, name_mr, mobile, password_hash, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminPass = bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD || 'AdminTest@2026', 10);
  const memberPass = bcrypt.hashSync('MemberTest@2026', 10);

  const adminId = 'user-admin-seed';
  const memberId = 'user-member-seed';

  userStmt.run(
    adminId,
    'admin',
    'Admin Trustee',
    'मुख्य विश्वस्त',
    '9800000001',
    adminPass,
    'ADMIN',
    1,
    1,
    1,
    1,
    '2026-01-01 08:00:00'
  );

  userStmt.run(
    memberId,
    'member',
    'Committee Member',
    'समिती सदस्य',
    '9800000002',
    memberPass,
    'MEMBER',
    1,
    1,
    1,
    0,
    '2026-01-01 08:30:00'
  );

  // 3. Insert Initial Synthetic Receipts
  const receiptStmt = db.prepare(`
    INSERT INTO receipts (id, receipt_no, donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, notes, collector_id, collector_name, issue_date, marathi_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  receiptStmt.run(
    'rec-1',
    'EMM-2026-0001',
    'Devotee One',
    '9800000003',
    'Airoli Sector-5',
    1000,
    'Rupees 1,000 Only',
    'Cash',
    'Paid',
    'गणेशोत्सव वर्गणी',
    memberId,
    'Committee Member (समिती सदस्य)',
    '2026-01-02 10:00:00',
    'वार: गुरुवार'
  );

  receiptStmt.run(
    'rec-2',
    'EMM-2026-0002',
    'Devotee Two',
    '9800000004',
    'Airoli Sector-5',
    250,
    'Rupees 250 Only',
    'UPI',
    'Paid',
    'आरती देणगी',
    adminId,
    'Admin Trustee (मुख्य विश्वस्त)',
    '2026-01-02 11:30:00',
    'वार: गुरुवार'
  );

  receiptStmt.run(
    'rec-3',
    'EMM-2026-0003',
    'Devotee Three',
    '9800000005',
    'Airoli Sector-5',
    501,
    'Rupees 501 Only',
    'Cash',
    'Paid',
    'विशेष संकल्प',
    adminId,
    'Admin Trustee (मुख्य विश्वस्त)',
    '2026-01-02 12:45:00',
    'वार: गुरुवार'
  );

  // 4. Insert Initial Synthetic Expense
  const expStmt = db.prepare(`
    INSERT INTO expenses (id, voucher_no, title, category, amount, paid_to, payment_method, authorized_by, recorder_id, recorder_name, expense_date, reason, bill_attachment_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  expStmt.run(
    'exp-1',
    'EXP-2026-0001',
    'Mandap Setup',
    'Mandap & Stage Setup',
    500,
    'Vendor Supplies',
    'Cash',
    'मुख्य विश्वस्त',
    adminId,
    'Admin Trustee (मुख्य विश्वस्त)',
    '2026-01-02',
    'मंडप कामासाठी साहित्य',
    null
  );

  // 5. Insert Initial Audit Logs
  const auditStmt = db.prepare(`
    INSERT INTO audit_logs (id, event_type, description, actor_id, actor_name, actor_role, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  auditStmt.run('aud-1', 'USER_LOGIN', 'Admin Trustee [अध्यक्ष/Admin] logged in successfully.', adminId, 'Admin Trustee (मुख्य विश्वस्त)', 'अध्यक्ष', '2026-01-02 09:00:00');
  auditStmt.run('aud-2', 'CREATE_RECEIPT', 'पावती तयार केली: क्र. EMM-2026-0001 | ₹1000 | Devotee One (जमा/Paid) जमाकर्ता: Committee Member', memberId, 'Committee Member', 'कार्यकर्ता', '2026-01-02 10:00:00');

  console.log('✅ Baseline seed data successfully populated with synthetic personas.');
}

if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedInitialData();
}
