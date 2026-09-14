#!/usr/bin/env node
/**
 * Automated SQLite Backup Script for Shree Siddhivinayak Mandir
 * Runs online zero-lock VACUUM INTO backup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const dbPath = process.env.DATABASE_PATH || path.join(projectRoot, 'server/data/mandal.db');
const backupDir = path.join(path.dirname(dbPath), 'backups');

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Source database does not exist at: ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `mandal_backup_${timestamp}.db`);

console.log(`📦 Starting online backup for: ${dbPath}`);
console.log(`🎯 Destination: ${backupPath}`);

try {
  const db = new Database(dbPath, { readonly: true });
  db.backup(backupPath)
    .then(() => {
      const stats = fs.statSync(backupPath);
      console.log(`✅ Backup successfully created! (${(stats.size / 1024).toFixed(2)} KB)`);
      db.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Backup failed:', err);
      db.close();
      process.exit(1);
    });
} catch (err) {
  console.error('❌ Database backup execution error:', err);
  process.exit(1);
}
