#!/usr/bin/env node
/**
 * Synthetic Demo Vargani & Devotee Donation Generator
 * Useful for load testing, UI demonstrations, and pagination stress tests
 * Usage: node generate_demo_vargani.js --count=10
 */

import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const dbPath = process.env.DATABASE_PATH || path.join(projectRoot, 'server/data/mandal.db');

const args = process.argv.slice(2);
let count = 5;
args.forEach(arg => {
  if (arg.startsWith('--count=')) {
    count = parseInt(arg.split('=')[1], 10) || 5;
  }
});

console.log(`Generating ${count} synthetic demo contributions in: ${dbPath}`);

const db = new Database(dbPath);

const sampleDonors = [
  { name: 'प्रमोद साळुंखे', mobile: '9820112233', galli: 'सेक्टर-५, गल्ली क्र. २', amount: 501 },
  { name: 'संदीप मोरे', mobile: '9820223344', galli: 'सेक्टर-५, गल्ली क्र. ४', amount: 1001 },
  { name: 'अश्विनी शिंदे', mobile: '9820334455', galli: 'सेक्टर-५, गल्ली क्र. १', amount: 251 },
  { name: 'निलेश कदम', mobile: '9820445566', galli: 'सेक्टर-५, मेन रोड', amount: 2100 },
  { name: 'महेश पाटील', mobile: '9820556677', galli: 'सेक्टर-५, गल्ली क्र. ३', amount: 5000 },
  { name: 'रोहन पवार', mobile: '9820667788', galli: 'सेक्टर-५, गल्ली क्र. ५', amount: 1100 }
];

const insertStmt = db.prepare(`
  INSERT INTO upi_contributions (
    id, intent_ref, donor_name, donor_mobile, amount, upi_ref_no,
    category_code, address_galli, verification_status, notes, created_at, submitted_at
  ) VALUES (?, ?, ?, ?, ?, ?, 'GANESHOTSAV_2024', ?, 'PENDING_VERIFICATION', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`);

let inserted = 0;
const currentYear = new Date().getFullYear();

for (let i = 0; i < count; i++) {
  const donor = sampleDonors[i % sampleDonors.length];
  const id = `demo-${crypto.randomUUID()}`;
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const intentRef = `INT-${currentYear}-${hex}`;
  const randomUTR = `${Math.floor(400000000000 + Math.random() * 599999999999)}`;
  const notes = `डेमो देणगी संकल्प #${i + 1}`;

  try {
    insertStmt.run(id, intentRef, donor.name, donor.mobile, donor.amount, randomUTR, donor.galli, notes);
    inserted++;
  } catch (err) {
    // Unique collision skip
  }
}

console.log(`✅ Successfully created ${inserted} pending demo contributions.`);
db.close();
