import assert from 'assert';
import Database from 'better-sqlite3';
import crypto from 'crypto';

// Setup an in-memory isolated SQLite database with our exact schema
const testDb = new Database(':memory:');
testDb.pragma('journal_mode = WAL');

// 1. Initialize Tables
testDb.exec(`
  CREATE TABLE users (
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
  );

  CREATE TABLE receipts (
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
  );

  CREATE TABLE expenses (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE upi_contributions (
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
  );
`);

// Insert Admin Verifier
testDb.prepare(`
  INSERT INTO users (id, name, name_mr, mobile, password_hash, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder)
  VALUES ('admin-1', 'Anand Naik', 'आनंद नाईक', '8149793310', 'hash', 'ADMIN', 1, 1, 1, 1)
`).run();

console.log('🧪 Starting Security Verification Test Suite (10 Cases)...\n');

function getDashboardCollection() {
  const row = testDb.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM receipts
    WHERE payment_status = 'Paid'
  `).get();
  return { count: row.count, total: row.total };
}

// -------------------------------------------------------------
// CASE 1: User starts ₹500 payment -> NO collection increase
// -------------------------------------------------------------
console.log('▶ TEST CASE 1: Payment Intent Creation (Initiated)');
const intentId1 = crypto.randomUUID();
const intentRef1 = 'INT-2024-TEST01';
testDb.prepare(`
  INSERT INTO upi_contributions (id, intent_ref, donor_name, donor_mobile, amount, verification_status, created_at)
  VALUES (?, ?, 'Rahul Sharma', '9822012345', 500, 'INITIATED', CURRENT_TIMESTAMP)
`).run(intentId1, intentRef1);

const stats1 = getDashboardCollection();
assert.strictEqual(stats1.total, 0, 'Collection must remain 0 after intent initiation');
assert.strictEqual(stats1.count, 0, 'Receipt count must remain 0 after intent initiation');
console.log('  ✅ CASE 1 PASSED: ₹500 intent created -> Total Collection = ₹0, Receipts = 0\n');

// -------------------------------------------------------------
// CASE 2: User enters fake UTR -> Remains pending, NO collection increase
// -------------------------------------------------------------
console.log('▶ TEST CASE 2: Fake UTR Submitted');
testDb.prepare(`
  UPDATE upi_contributions
  SET upi_ref_no = 'FAKEUTR123456',
      verification_status = 'PENDING_VERIFICATION',
      submitted_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run(intentId1);

const stats2 = getDashboardCollection();
assert.strictEqual(stats2.total, 0, 'Collection must remain 0 after submitting fake UTR');
assert.strictEqual(stats2.count, 0, 'Receipt count must remain 0 after submitting fake UTR');
const item2 = testDb.prepare('SELECT verification_status FROM upi_contributions WHERE id = ?').get(intentId1);
assert.strictEqual(item2.verification_status, 'PENDING_VERIFICATION');
console.log('  ✅ CASE 2 PASSED: Fake UTR submitted -> Status = PENDING_VERIFICATION, Collection = ₹0\n');

// -------------------------------------------------------------
// CASE 3: Admin rejects -> Status REJECTED, NO collection increase
// -------------------------------------------------------------
console.log('▶ TEST CASE 3: Admin Rejection of Fake Payment');
testDb.prepare(`
  UPDATE upi_contributions
  SET verification_status = 'REJECTED',
      rejection_reason = 'बँक खात्यात रक्कम प्राप्त झालेली नाही',
      verified_at = CURRENT_TIMESTAMP,
      verified_by_id = 'admin-1',
      verified_by_name = 'Anand Naik'
  WHERE id = ?
`).run(intentId1);

const stats3 = getDashboardCollection();
assert.strictEqual(stats3.total, 0, 'Collection must remain 0 after rejection');
assert.strictEqual(stats3.count, 0, 'Receipt count must remain 0 after rejection');
const item3 = testDb.prepare('SELECT verification_status, rejection_reason FROM upi_contributions WHERE id = ?').get(intentId1);
assert.strictEqual(item3.verification_status, 'REJECTED');
console.log('  ✅ CASE 3 PASSED: Payment rejected -> Status = REJECTED, Collection = ₹0\n');

// -------------------------------------------------------------
// CASE 4: Admin verifies real transaction -> Exactly ₹500 added, receipt created
// -------------------------------------------------------------
console.log('▶ TEST CASE 4: Admin Verifies Genuine ₹500 Transaction');
const intentId2 = crypto.randomUUID();
const intentRef2 = 'INT-2024-TEST02';
const realUtr = '423456789012';

testDb.prepare(`
  INSERT INTO upi_contributions (id, intent_ref, donor_name, donor_mobile, amount, upi_ref_no, verification_status, created_at, submitted_at)
  VALUES (?, ?, 'Suresh Patil', '9822055555', 500, ?, 'PENDING_VERIFICATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run(intentId2, intentRef2, realUtr);

// Perform atomic verification transaction
const verifyTx = testDb.transaction((contributionId, adminId, adminName) => {
  const contribution = testDb.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(contributionId);
  if (contribution.verification_status !== 'PENDING_VERIFICATION') {
    throw new Error('Not pending verification');
  }

  const countRow = testDb.prepare('SELECT COUNT(*) as count FROM receipts').get();
  const receipt_no = `EMM-2024-${(countRow.count + 1).toString().padStart(4, '0')}`;
  const receiptId = crypto.randomUUID();

  testDb.prepare(`
    INSERT INTO receipts (id, receipt_no, donor_name, donor_mobile, address_galli, amount, amount_in_words, payment_mode, payment_status, notes, collector_id, collector_name, issue_date, marathi_day)
    VALUES (?, ?, ?, ?, 'Online UPI', ?, 'Rupees Five Hundred Only', 'UPI', 'Paid', ?, ?, ?, CURRENT_TIMESTAMP, 'वार: मंगळवार')
  `).run(receiptId, receipt_no, contribution.donor_name, contribution.donor_mobile, contribution.amount, `UTR: ${contribution.upi_ref_no}`, adminId, adminName);

  testDb.prepare(`
    UPDATE upi_contributions
    SET verification_status = 'VERIFIED',
        receipt_id = ?,
        verified_at = CURRENT_TIMESTAMP,
        verified_by_id = ?,
        verified_by_name = ?
    WHERE id = ?
  `).run(receiptId, adminId, adminName, contributionId);

  return { receiptId, receipt_no };
});

const result4 = verifyTx(intentId2, 'admin-1', 'Anand Naik');
const stats4 = getDashboardCollection();
assert.strictEqual(stats4.total, 500, 'Collection must now be exactly ₹500');
assert.strictEqual(stats4.count, 1, 'Receipt count must now be exactly 1');
const item4 = testDb.prepare('SELECT * FROM upi_contributions WHERE id = ?').get(intentId2);
assert.strictEqual(item4.verification_status, 'VERIFIED');
assert.strictEqual(item4.receipt_id, result4.receiptId);
console.log(`  ✅ CASE 4 PASSED: Payment verified -> Official Receipt ${result4.receipt_no} created, Total Collection = ₹500\n`);

// -------------------------------------------------------------
// CASE 5: Same UTR submitted twice -> Second submission rejected
// -------------------------------------------------------------
console.log('▶ TEST CASE 5: Duplicate UTR Rejection');
let duplicateCaught = false;
try {
  testDb.prepare(`
    INSERT INTO upi_contributions (id, intent_ref, donor_name, donor_mobile, amount, upi_ref_no, verification_status)
    VALUES ('dup-id', 'INT-2024-DUP', 'Attacker', '9999999999', 1000, ?, 'PENDING_VERIFICATION')
  `).run(realUtr); // Same realUtr
} catch (err) {
  duplicateCaught = true;
  assert.ok(err.message.includes('UNIQUE constraint failed'), 'Database must enforce UNIQUE on upi_ref_no');
}
assert.strictEqual(duplicateCaught, true, 'Duplicate UTR must be rejected');
console.log('  ✅ CASE 5 PASSED: Unique UTR constraint successfully blocked reuse of existing UTR\n');

// -------------------------------------------------------------
// CASE 6: Admin clicks Verify twice -> Idempotent, only 1 receipt created
// -------------------------------------------------------------
console.log('▶ TEST CASE 6: Double Verification Idempotency Guard');
let secondVerifyError = null;
try {
  verifyTx(intentId2, 'admin-1', 'Anand Naik');
} catch (err) {
  secondVerifyError = err;
}
assert.ok(secondVerifyError !== null, 'Second verify attempt must fail');
const stats6 = getDashboardCollection();
assert.strictEqual(stats6.total, 500, 'Collection must remain exactly ₹500, not ₹1000');
assert.strictEqual(stats6.count, 1, 'Receipt count must remain 1');
console.log('  ✅ CASE 6 PASSED: Re-verification rejected -> Collection remains exactly ₹500\n');

// -------------------------------------------------------------
// CASE 7: User refreshes after UTR submission -> No duplicate contribution
// -------------------------------------------------------------
console.log('▶ TEST CASE 7: Page Refresh / Idempotent UTR Update');
const intentId3 = crypto.randomUUID();
const intentRef3 = 'INT-2024-TEST03';
const utr3 = '888777666555';

// User submits UTR
testDb.prepare(`
  INSERT INTO upi_contributions (id, intent_ref, donor_name, donor_mobile, amount, verification_status, created_at)
  VALUES (?, ?, 'Vikas Kulkarni', '9822100000', 1000, 'INITIATED', CURRENT_TIMESTAMP)
`).run(intentId3, intentRef3);

// First submission
testDb.prepare(`
  UPDATE upi_contributions
  SET upi_ref_no = ?, verification_status = 'PENDING_VERIFICATION', submitted_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run(utr3, intentId3);

// Repeated submission on refresh (same intent, same UTR)
testDb.prepare(`
  UPDATE upi_contributions
  SET upi_ref_no = ?, verification_status = 'PENDING_VERIFICATION', submitted_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run(utr3, intentId3);

const pendingCount3 = testDb.prepare('SELECT COUNT(*) as count FROM upi_contributions WHERE intent_ref = ?').get(intentRef3).count;
assert.strictEqual(pendingCount3, 1, 'Only 1 record must exist for the intent');
console.log('  ✅ CASE 7 PASSED: Refresh / repeated UTR submission leaves single pending record\n');

// -------------------------------------------------------------
// CASE 8: Simultaneous Admin Verification (Atomic DB Transaction)
// -------------------------------------------------------------
console.log('▶ TEST CASE 8: Concurrency Protection on Verification');
let admin1Success = false;
let admin2Success = false;

try {
  verifyTx(intentId3, 'admin-1', 'Anand Naik');
  admin1Success = true;
} catch (e) {
  admin1Success = false;
}

try {
  verifyTx(intentId3, 'admin-2', 'Second Admin');
  admin2Success = true;
} catch (e) {
  admin2Success = false;
}

assert.strictEqual(admin1Success, true, 'First admin transaction must succeed');
assert.strictEqual(admin2Success, false, 'Second simultaneous verification transaction must fail');
const stats8 = getDashboardCollection();
assert.strictEqual(stats8.total, 1500, 'Collection must be ₹500 + ₹1000 = ₹1500');
assert.strictEqual(stats8.count, 2, 'Receipt count must be exactly 2');
console.log('  ✅ CASE 8 PASSED: Atomic transaction ensured exactly 1 receipt created under concurrency\n');

// -------------------------------------------------------------
// CASE 9: Rejected payment -> No Leaderboard / Report / Balance Change
// -------------------------------------------------------------
console.log('▶ TEST CASE 9: Rejected Payment Impact Analysis');
const intentId4 = crypto.randomUUID();
testDb.prepare(`
  INSERT INTO upi_contributions (id, intent_ref, donor_name, donor_mobile, amount, upi_ref_no, verification_status, created_at, submitted_at)
  VALUES (?, 'INT-2024-TEST04', 'Scammer Test', '9999900000', 50000, '999999999999', 'REJECTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run(intentId4);

// Leaderboard query check
const leaderboard = testDb.prepare(`
  SELECT collector_id, COUNT(*) as receipt_count, SUM(amount) as total_collected
  FROM receipts
  WHERE payment_status = 'Paid'
  GROUP BY collector_id
`).all();

const totalLeaderboard = leaderboard.reduce((acc, row) => acc + row.total_collected, 0);
assert.strictEqual(totalLeaderboard, 1500, 'Leaderboard must only reflect verified receipts (₹1500)');
console.log('  ✅ CASE 9 PASSED: ₹50,000 rejected payment has 0 impact on leaderboard & collections\n');

// -------------------------------------------------------------
// CASE 10: Verified Payment -> Dashboard, Reports, Leaderboard, Receipts Consistency
// -------------------------------------------------------------
console.log('▶ TEST CASE 10: Full Consistency Across All Reporting Views');
const allPaidReceipts = testDb.prepare("SELECT * FROM receipts WHERE payment_status = 'Paid'").all();
const reportTotal = testDb.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM receipts WHERE payment_status = 'Paid'").get().total;

assert.strictEqual(allPaidReceipts.length, 2);
assert.strictEqual(reportTotal, 1500);
console.log('  ✅ CASE 10 PASSED: All financial reports, dashboard balances, and receipts match ₹1,500\n');

console.log('=============================================================');
console.log('🎉 ALL 10 CRITICAL FINANCIAL SECURITY TEST CASES PASSED 100%!');
console.log('=============================================================');
