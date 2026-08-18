import bcrypt from 'bcryptjs';
import db, { initDatabase } from './database.js';

export function ensureCleanProductionDatabase() {
  // Ensure tables exist
  initDatabase();

  // 1. Ensure Mandal Settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM mandal_settings').get();
  if (settingsCount.count === 0) {
    const mandalStmt = db.prepare(`
      INSERT INTO mandal_settings (id, name_en, name_mr, location_en, location_mr, reg_no, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    mandalStmt.run(
      'mandal-1',
      process.env.MANDAL_NAME_EN || 'Ekdant Mitra Mandal Unchgaon',
      process.env.MANDAL_NAME_MR || 'एकदंत मित्र मंडळ, उचगाव',
      process.env.MANDAL_LOCATION_EN || 'Unchgaon, Kolhapur (Maharashtra)',
      process.env.MANDAL_LOCATION_MR || 'उचगाव, ता. करवीर, जि. कोल्हापूर',
      process.env.MANDAL_REG_NO || 'MH/08/2024',
      parseInt(process.env.MANDAL_YEAR || '2024', 10)
    );
    console.log('🏛️ Mandal production settings initialized.');
  }

  // 2. Ensure ONLY the legitimate Founder Administrator account exists if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const adminMobile = process.env.ADMIN_MOBILE || '8149793310';
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Anand@8149';
    const passwordHash = bcrypt.hashSync(adminPass, 10);

    const userStmt = db.prepare(`
      INSERT INTO users (id, name, name_mr, mobile, password_hash, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    userStmt.run(
      'user-founder-admin',
      process.env.ADMIN_NAME_EN || 'Anand Naik',
      process.env.ADMIN_NAME_MR || 'आनंद नाईक - मुख्य अध्यक्ष',
      adminMobile,
      passwordHash,
      'ADMIN',
      1,
      1,
      1,
      1,
      new Date().toISOString()
    );

    console.log(`👑 Legitimate Founder Administrator account initialized: ${adminMobile}`);
  }

  console.log('✨ Production Database verified: Clean state active.');
}

export function resetToCleanProduction() {
  initDatabase();

  // Clear all transactional and non-founder tables in foreign-key safe order
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM expenses;
    DELETE FROM upi_contributions;
    DELETE FROM receipts;
    DELETE FROM users WHERE is_protected_founder = 0;
  `);

  // Ensure founder admin exists
  const founder = db.prepare('SELECT id FROM users WHERE is_protected_founder = 1').get();
  if (!founder) {
    ensureCleanProductionDatabase();
  }

  console.log('🧹 Clean production database reset complete: 0 receipts, 0 expenses, 0 upi contributions, 0 demo members, 0 audit logs.');
}
