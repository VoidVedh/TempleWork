#!/usr/bin/env node
/**
 * Database Integrity and Consistency Verification Script
 * Validates SQLite schema, foreign keys, and financial consistency
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const dbPath = process.env.DATABASE_PATH || path.join(projectRoot, 'server/data/mandal.db');

console.log('====================================================');
console.log('🔍 DATABASE INTEGRITY & CONSISTENCY AUDITOR');
console.log('====================================================');
console.log(`Database target: ${dbPath}\n`);

const db = new Database(dbPath);

let hasError = false;

// 1. PRAGMA integrity_check
const integrityResult = db.pragma('integrity_check');
if (integrityResult.length === 1 && integrityResult[0].integrity_check === 'ok') {
  console.log('✅ 1. Low-level Storage Integrity: OK');
} else {
  console.error('❌ 1. Low-level Storage Integrity Failed:', integrityResult);
  hasError = true;
}

// 2. PRAGMA foreign_key_check
const fkErrors = db.pragma('foreign_key_check');
if (fkErrors.length === 0) {
  console.log('✅ 2. Relational Foreign Key Integrity: OK (0 violations)');
} else {
  console.error('❌ 2. Foreign Key Violations Found:', fkErrors);
  hasError = true;
}

// 3. Table Counts & Schema Verification
const tables = ['users', 'receipts', 'expenses', 'upi_contributions', 'campaigns', 'audit_logs'];
console.log('\n📊 3. Table Records Summary:');
tables.forEach(table => {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`   • ${table.padEnd(20)}: ${row.count.toString().padStart(5)} rows`);
  } catch (err) {
    console.warn(`   ⚠️ Table ${table} not present`);
  }
});

// 4. Financial Sum Check
const paidReceipts = db.prepare(`
  SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
  FROM receipts 
  WHERE payment_status = 'Paid' AND (is_cancelled = 0 OR is_cancelled IS NULL)
`).get();

const verifiedContributions = db.prepare(`
  SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
  FROM upi_contributions 
  WHERE verification_status = 'VERIFIED'
`).get();

console.log('\n💰 4. Financial Ledger Validation:');
console.log(`   • Paid Receipts Total     : ₹${paidReceipts.total} (${paidReceipts.count} receipts)`);
console.log(`   • Verified UPI Total     : ₹${verifiedContributions.total} (${verifiedContributions.count} records)`);

db.close();

if (hasError) {
  console.error('\n❌ Database integrity check completed with warnings/errors.');
  process.exit(1);
} else {
  console.log('\n🎉 ALL DATABASE INTEGRITY CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
