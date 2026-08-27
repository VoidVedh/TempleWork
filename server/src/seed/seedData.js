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
    'Unchgaon, Kolhapur (Maharashtra)',
    'उचगाव, ता. करवीर, जि. कोल्हापूर',
    'MH/08/2024',
    2024
  );

  // 2. Insert Users
  const userStmt = db.prepare(`
    INSERT INTO users (id, name, name_mr, mobile, password_hash, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const anandPass = bcrypt.hashSync('Anand@8149', 10);
  const ajayPass = bcrypt.hashSync('123456', 10);

  const anandId = 'user-anand-naik';
  const ajayId = 'user-ajay-jadhav';

  userStmt.run(
    anandId,
    'Anand Naik',
    'आनंद नाईक - मुख्य अध्यक्ष',
    '8149793310',
    anandPass,
    'ADMIN',
    1,
    1,
    1,
    1,
    '2024-08-15 08:00:00'
  );

  userStmt.run(
    ajayId,
    'Ajay Jadhav',
    'अजय जाधव',
    '9921404170',
    ajayPass,
    'MEMBER',
    1,
    1,
    1,
    0,
    '2024-08-15 08:30:00'
  );

  // 3. Insert Initial Receipts (Total ₹ 4,251)
  const receiptStmt = db.prepare(`
    INSERT INTO receipts (id, receipt_no, donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, notes, collector_id, collector_name, issue_date, marathi_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  receiptStmt.run(
    'rec-1',
    'EMM-2024-0001',
    'Prakash Patil',
    '9822101010',
    'Unchgaon Galli No 1',
    1000,
    'Rupees 1,000 Only',
    'Cash',
    'Paid',
    'गणेशोत्सव वर्गणी',
    ajayId,
    'Ajay Jadhav (अजय जाधव)',
    '2024-08-15 10:00:00',
    'वार: गुरुवार'
  );

  receiptStmt.run(
    'rec-2',
    'EMM-2024-0002',
    'Suresh Patil',
    '9822302020',
    'Kolhapur Road',
    250,
    'Rupees 250 Only',
    'Google Pay (UPI)',
    'Paid',
    'आरती देणगी',
    anandId,
    'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)',
    '2024-08-15 11:30:00',
    'वार: गुरुवार'
  );

  receiptStmt.run(
    'rec-3',
    'EMM-2024-0003',
    'Abc',
    '9876543210',
    'Main Chauk',
    501,
    'Rupees 501 Only',
    'Cash',
    'Paid',
    'विशेष संकल्प',
    anandId,
    'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)',
    '2024-08-15 12:45:00',
    'वार: गुरुवार'
  );

  receiptStmt.run(
    'rec-4',
    'EMM-2024-0004',
    'Ankita khot',
    '9306885012',
    'Unchgaon Mandir Galli',
    500,
    'Rupees 500 Only',
    'PhonePe',
    'Paid',
    'महाप्रसाद देणगी',
    anandId,
    'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)',
    '2024-08-15 14:00:00',
    'वार: गुरुवार'
  );

  receiptStmt.run(
    'rec-5',
    'EMM-2024-0005',
    'Sagar Patil',
    '9922343103',
    'Patil Galli, Unchgaon',
    2000,
    'Rupees 2,000 Only',
    'PhonePe',
    'Paid',
    'मंडळ वर्गणी',
    anandId,
    'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)',
    '2024-08-15 21:03:04',
    'वार: गुरुवार'
  );

  // 4. Insert Initial Expense (Total ₹ 500)
  const expStmt = db.prepare(`
    INSERT INTO expenses (id, voucher_no, title, category, amount, paid_to, payment_method, authorized_by, recorder_id, recorder_name, expense_date, reason, bill_attachment_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  expStmt.run(
    'exp-1',
    'EXP-2024-0001',
    'Madap',
    'Mandap & Stage Setup',
    500,
    'Narad Kirana',
    'Cash',
    'आनंद नाईक (मुख्य अध्यक्ष)',
    anandId,
    'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)',
    '2024-08-15',
    'मंडप कामासाठी किरकोळ साहित्य',
    null
  );

  // 5. Insert Initial Audit Logs
  const auditStmt = db.prepare(`
    INSERT INTO audit_logs (id, event_type, description, actor_id, actor_name, actor_role, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  auditStmt.run('aud-1', 'USER_LOGIN', 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष) [अध्यक्ष/Admin] logged in successfully.', anandId, 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)', 'अध्यक्ष', '2024-08-15 20:59:52');
  auditStmt.run('aud-2', 'USER_LOGOUT', 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष) logged out.', anandId, 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)', 'अध्यक्ष', '2024-08-15 21:00:11');
  auditStmt.run('aud-3', 'USER_LOGIN', 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष) [अध्यक्ष/Admin] logged in successfully.', anandId, 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)', 'अध्यक्ष', '2024-08-15 21:00:55');
  auditStmt.run('aud-4', 'CREATE_RECEIPT', 'पावती तयार केली: क्र. EMM-2024-0005 | ₹2000 | Sagar Patil (जमा/Paid) जमाकर्ता: Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)', anandId, 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)', 'अध्यक्ष', '2024-08-15 21:03:04');
  auditStmt.run('aud-5', 'USER_LOGOUT', 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष) logged out.', anandId, 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)', 'अध्यक्ष', '2024-08-15 21:03:30');
  auditStmt.run('aud-6', 'USER_LOGIN', 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष) [अध्यक्ष/Admin] logged in successfully.', anandId, 'Anand Naik (आनंद नाईक - मुख्य अध्यक्ष)', 'अध्यक्ष', '2024-08-15 21:03:57');

  console.log('✅ Baseline seed data successfully populated.');
}

if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedInitialData();
}
