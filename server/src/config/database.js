import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DB_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mandal.db');
console.log(`💾 SQLite Database path resolved to: ${dbPath}`);
const db = new Database(dbPath);

// Enable WAL mode for concurrency
db.pragma('journal_mode = WAL');

export function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_mr TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      can_change_payment_status INTEGER NOT NULL DEFAULT 0,
      can_manage_expenses INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_protected_founder INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Receipts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      receipt_no TEXT UNIQUE NOT NULL,
      donor_name TEXT NOT NULL,
      donor_mobile TEXT,
      address_galli TEXT,
      amount REAL NOT NULL,
      amount_in_words TEXT NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      payment_status TEXT NOT NULL DEFAULT 'Paid',
      notes TEXT,
      collector_id TEXT NOT NULL,
      collector_name TEXT NOT NULL,
      issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      marathi_day TEXT,
      FOREIGN KEY (collector_id) REFERENCES users(id)
    )
  `);

  // 3. Expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      voucher_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_to TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      authorized_by TEXT NOT NULL,
      recorder_id TEXT NOT NULL,
      recorder_name TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      reason TEXT,
      bill_attachment_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recorder_id) REFERENCES users(id)
    )
  `);

  // 4. Audit Log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Mandal Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mandal_settings (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_mr TEXT NOT NULL,
      location_en TEXT NOT NULL,
      location_mr TEXT NOT NULL,
      reg_no TEXT NOT NULL,
      year INTEGER NOT NULL DEFAULT 2024
    )
  `);

  // 6. UPI Contributions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS upi_contributions (
      id TEXT PRIMARY KEY,
      intent_ref TEXT UNIQUE,
      donor_name TEXT NOT NULL,
      donor_mobile TEXT NOT NULL,
      amount REAL NOT NULL,
      upi_ref_no TEXT UNIQUE,
      payment_app TEXT,
      verification_status TEXT NOT NULL DEFAULT 'INITIATED',
      receipt_id TEXT UNIQUE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      verified_at DATETIME,
      verified_by_id TEXT,
      verified_by_name TEXT,
      rejection_reason TEXT,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id)
    )
  `);

  // Perform backward-compatible column migration if table existed with older schema
  try {
    const columns = db.prepare(`PRAGMA table_info(upi_contributions)`).all().map(c => c.name);
    if (!columns.includes('intent_ref')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN intent_ref TEXT;`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_intent_ref ON upi_contributions(intent_ref);`);
    }
    if (!columns.includes('created_at')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN created_at DATETIME;`);
    }
  } catch (e) {
    console.error('Migration warning on upi_contributions:', e.message);
  }

  console.log('✅ SQLite Database initialized with all required tables.');
}

export default db;
