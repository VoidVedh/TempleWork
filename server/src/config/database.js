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
      category_code TEXT DEFAULT 'GANESHOTSAV_2024',
      campaign_id TEXT,
      address_galli TEXT,
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

  // 7. Donors table (Entity Normalization)
  db.exec(`
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      address_galli TEXT,
      total_contributions REAL DEFAULT 0,
      contributions_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Campaigns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_mr TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL DEFAULT 500000,
      category_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Bank Transactions table (Reconciliation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      utr TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      payer_name TEXT,
      transaction_date DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNMATCHED',
      reconciled_with_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default campaigns if not present
  try {
    const campaignCount = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
    if (campaignCount.count === 0) {
      const insertCampaign = db.prepare(`
        INSERT INTO campaigns (id, name_en, name_mr, description, target_amount, category_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertCampaign.run('cmp-1', 'Ganeshotsav 2024 Vargani', 'सार्वजनिक गणेशोत्सव २०२४ वर्गणी', 'Annual Ganesh Festival Celebrations', 500000, 'GANESHOTSAV_2024');
      insertCampaign.run('cmp-2', 'Mandir Development & Renovation', 'मंदिर जीर्णोद्धार व विकास निधी', 'Temple Infrastructure & Maintenance', 1000000, 'MANDIR_DEVELOPMENT');
      insertCampaign.run('cmp-3', 'Mahaprasad & Annadaan Fund', 'महाप्रसाद व अन्नदान देणगी', 'Devotee Feast and Annadaan Seva', 250000, 'MAHAPRASAD');
      insertCampaign.run('cmp-4', 'General Vargani / Donation', 'सामान्य देणगी / वर्गणी', 'General Temple Offerings and Seva', 200000, 'GENERAL');
    }
  } catch (e) {
    console.error('Campaign initialization error:', e.message);
  }

  // Perform backward-compatible column migrations
  try {
    // 1. upi_contributions migrations
    const upiCols = db.prepare(`PRAGMA table_info(upi_contributions)`).all().map(c => c.name);
    if (!upiCols.includes('intent_ref')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN intent_ref TEXT;`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_intent_ref ON upi_contributions(intent_ref);`);
    }
    if (!upiCols.includes('created_at')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN created_at DATETIME;`);
    }
    if (!upiCols.includes('category_code')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN category_code TEXT DEFAULT 'GANESHOTSAV_2024';`);
    }
    if (!upiCols.includes('address_galli')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN address_galli TEXT;`);
    }

    // 2. receipts migrations
    const receiptCols = db.prepare(`PRAGMA table_info(receipts)`).all().map(c => c.name);
    if (!receiptCols.includes('category_code')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN category_code TEXT DEFAULT 'GANESHOTSAV_2024';`);
    }
    if (!receiptCols.includes('is_cancelled')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN is_cancelled INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!receiptCols.includes('cancellation_reason')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN cancellation_reason TEXT;`);
    }
    if (!receiptCols.includes('upi_ref_no')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN upi_ref_no TEXT;`);
    }

    // 3. expenses migrations
    const expenseCols = db.prepare(`PRAGMA table_info(expenses)`).all().map(c => c.name);
    if (!expenseCols.includes('status')) {
      db.exec(`ALTER TABLE expenses ADD COLUMN status TEXT DEFAULT 'APPROVED';`);
    }
    if (!expenseCols.includes('is_cancelled')) {
      db.exec(`ALTER TABLE expenses ADD COLUMN is_cancelled INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!expenseCols.includes('cancellation_reason')) {
      db.exec(`ALTER TABLE expenses ADD COLUMN cancellation_reason TEXT;`);
    }
  } catch (e) {
    console.error('Migration warning:', e.message);
  }

  console.log('✅ SQLite Database initialized with all required tables.');
}

export default db;
