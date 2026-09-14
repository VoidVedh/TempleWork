import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

console.log('====================================================');
console.log('🚩 RUNNING CLIENT IMPROVEMENTS & RELEASE AUDIT TEST');
console.log('====================================================\n');

// 1. REQUIREMENT A: 2024 CLEANUP
console.log('▶ [REQUIREMENT A] 2024 Cleanup Verification...');
const publicPortalSrc = fs.readFileSync(path.join(projectRoot, 'client/src/views/PublicDevoteePortalView.jsx'), 'utf8');
assert.ok(!publicPortalSrc.includes('सार्वजनिक गणेशोत्सव २०२४'), 'Inappropriate 2024 festival string found in PublicDevoteePortalView');
assert.ok(!publicPortalSrc.includes('EMM-2024-0001'), 'Inappropriate 2024 placeholder found in PublicDevoteePortalView');
assert.ok(publicPortalSrc.includes('new Date().getFullYear()'), 'Dynamic current year not used in PublicDevoteePortalView');

const mandalConfigSrc = fs.readFileSync(path.join(projectRoot, 'server/src/config/mandalConfig.js'), 'utf8');
assert.ok(!mandalConfigSrc.includes("|| '2024'"), "mandalConfig has hardcoded '2024'");
assert.ok(mandalConfigSrc.includes('new Date().getFullYear()'), 'mandalConfig missing dynamic year');
console.log('  ✅ Requirement A PASSED: Inappropriate 2024 references removed and dynamic year applied\n');

// 2. REQUIREMENT B: ARTI TIMINGS (8:00 AM / 8:00 PM)
console.log('▶ [REQUIREMENT B] Temple Arti Timings Verification...');
const templeConfigSrc = fs.readFileSync(path.join(projectRoot, 'client/src/config/templeConfig.js'), 'utf8');
assert.ok(templeConfigSrc.includes("morning: '8:00 AM'"), 'Morning aarti is not 8:00 AM in templeConfig');
assert.ok(templeConfigSrc.includes("evening: '8:00 PM'"), 'Evening aarti is not 8:00 PM in templeConfig');

const translationsSrc = fs.readFileSync(path.join(projectRoot, 'client/src/i18n/translations.js'), 'utf8');
assert.ok(translationsSrc.includes("सकाळची आरती: ०८:०० AM | संध्याकाळची आरती: ०८:०० PM"), 'Marathi aarti timings not 08:00 AM / 08:00 PM');
assert.ok(translationsSrc.includes("Morning Aarti: 08:00 AM | Evening Aarti: 08:00 PM"), 'English aarti timings not 08:00 AM / 08:00 PM');
assert.ok(translationsSrc.includes("प्रातः आरती: ०८:०० AM | संध्या आरती: ०८:०० PM"), 'Hindi aarti timings not 08:00 AM / 08:00 PM');
assert.ok(!translationsSrc.includes("०७:३० AM"), 'Old 07:30 AM timing still found in translations');

const footerSrc = fs.readFileSync(path.join(projectRoot, 'client/src/components/layout/Footer.jsx'), 'utf8');
assert.ok(footerSrc.includes('TEMPLE_ARTI_TIMINGS'), 'Footer.jsx does not consume TEMPLE_ARTI_TIMINGS');
console.log('  ✅ Requirement B PASSED: Arti timings updated to Morning 8:00 AM & Evening 8:00 PM\n');

// 3. REQUIREMENT C: TRILINGUAL RECEIPTS (EN, HI, MR)
console.log('▶ [REQUIREMENT C] Trilingual Receipts Verification...');
const receiptTranslationsSrc = fs.readFileSync(path.join(projectRoot, 'client/src/i18n/receiptTranslations.js'), 'utf8');
import { receiptLabels } from '../../../client/src/i18n/receiptTranslations.js';
assert.ok(receiptLabels.mr, 'Missing Marathi receipt labels');
assert.ok(receiptLabels.hi, 'Missing Hindi receipt labels');
assert.ok(receiptLabels.en, 'Missing English receipt labels');
assert.ok(receiptLabels.trilingual, 'Missing Trilingual receipt labels');

// Check key fields across all languages
for (const lang of ['mr', 'hi', 'en', 'trilingual']) {
  const l = receiptLabels[lang];
  assert.ok(l.receiptNoLabel, `Missing receiptNoLabel in ${lang}`);
  assert.ok(l.donorLabel, `Missing donorLabel in ${lang}`);
  assert.ok(l.wordsLabel, `Missing wordsLabel in ${lang}`);
  assert.ok(l.modeLabel, `Missing modeLabel in ${lang}`);
  assert.ok(l.totalAmountLabel, `Missing totalAmountLabel in ${lang}`);
  assert.ok(l.thankYou, `Missing thankYou in ${lang}`);
}

const certModalSrc = fs.readFileSync(path.join(projectRoot, 'client/src/components/receipts/ReceiptCertificateModal.jsx'), 'utf8');
assert.ok(certModalSrc.includes('receiptLabels'), 'ReceiptCertificateModal missing receiptLabels import');
assert.ok(certModalSrc.includes('setReceiptLang'), 'ReceiptCertificateModal missing language switcher');
assert.ok(certModalSrc.includes('trilingual'), 'ReceiptCertificateModal missing trilingual mode');
console.log('  ✅ Requirement C PASSED: English, Hindi, Marathi, and Trilingual receipts fully implemented\n');

// 4. DUPLICATE UTR PROTECTION
console.log('▶ [CUSTOMER EXPERIENCE] Duplicate UTR Protection...');
import db from '../config/database.js';
import { submitUpiContribution } from '../controllers/upiController.js';

function createMockRes() {
  let statusCode = 200;
  let data = null;
  return {
    status(code) { statusCode = code; return this; },
    json(payload) { data = payload; return this; },
    getStatusCode() { return statusCode; },
    getData() { return data; }
  };
}

const dupUtr = `UTR-TEST-${Date.now()}`;
const dupIntentRef1 = `INT-DUP-${Date.now()}-1`;
const dupIntentRef2 = `INT-DUP-${Date.now()}-2`;

// Clean up
db.prepare('DELETE FROM upi_contributions WHERE upi_ref_no = ?').run(dupUtr);

// Insert first submission
db.prepare(`
  INSERT INTO upi_contributions (id, intent_ref, donor_name, donor_mobile, amount, upi_ref_no, verification_status)
  VALUES ('dup-test-1', ?, 'First Devotee', '9800000001', 501, ?, 'PENDING_VERIFICATION')
`).run(dupIntentRef1, dupUtr);

// Attempt duplicate submission with different intent
const reqDup = {
  body: {
    intent_id: 'dup-test-2',
    intent_ref: dupIntentRef2,
    upi_ref_no: dupUtr,
    donor_name: 'Imposter Devotee',
    donor_mobile: '9800000002',
    amount: 501
  }
};
const resDup = createMockRes();
submitUpiContribution(reqDup, resDup);
assert.strictEqual(resDup.getStatusCode(), 400, 'Duplicate UTR must return 400');
assert.ok(resDup.getData().error.includes('आधीच वापरण्यात आला आहे'), 'Expected duplicate UTR error message');
db.prepare('DELETE FROM upi_contributions WHERE upi_ref_no = ?').run(dupUtr);
console.log('  ✅ Duplicate UTR Protection PASSED: Duplicate UTR rejected with 400 error\n');

// 5. ADMIN UX VERIFICATION MODAL ENHANCEMENTS
console.log('▶ [ADMIN UX] Admin Verification Modal Search & Review State...');
const adminModalSrc = fs.readFileSync(path.join(projectRoot, 'client/src/components/upi/AdminUpiVerificationModal.jsx'), 'utf8');
assert.ok(adminModalSrc.includes('searchQuery'), 'AdminUpiVerificationModal missing search feature');
assert.ok(adminModalSrc.includes('verifyingItem'), 'AdminUpiVerificationModal missing dedicated review state');
console.log('  ✅ Admin UX PASSED: Search filter and dedicated review confirmation implemented\n');

console.log('====================================================');
console.log('🎉 ALL CLIENT IMPROVEMENTS TESTS PASSED (100%)!');
console.log('====================================================\n');
process.exit(0);
