/**
 * live_runner_test.js
 * 
 * End-to-End Live HTTP Runner & Verification Suite
 * Boots the actual Express application on an ephemeral port, performs live HTTP requests
 * across all core routes (Frontend SPA, Public APIs, Admin Auth, UPI, WhatsApp Webhooks),
 * and verifies complete end-to-end functionality.
 */

import http from 'http';
import assert from 'assert';
import crypto from 'crypto';
import { app } from '../index.js';
import db, { initDatabase } from '../config/database.js';
import { ensureCleanProductionDatabase } from '../config/initCleanDatabase.js';

async function runLiveServerTest() {
  console.log('====================================================');
  console.log('🚀 RUNNING LIVE SERVER END-TO-END HTTP TEST SUITE');
  console.log('====================================================\n');

  initDatabase();
  ensureCleanProductionDatabase();

  const PORT = process.env.PORT || 5001;
  const baseUrl = `http://127.0.0.1:${PORT}`;
  process.env.WHATSAPP_VERIFY_TOKEN = 'live_verify_token_999';
  process.env.WHATSAPP_APP_SECRET = 'live_app_secret_888';

  let liveServer = null;
  let startedOurOwn = false;

  try {
    const ping = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(600) });
    if (ping.ok) {
      console.log(`ℹ️  Detected active server running on ${baseUrl}. Connecting to live instance...\n`);
    }
  } catch (err) {
    console.log(`ℹ️  No server detected on ${baseUrl}. Starting instance...\n`);
    liveServer = app.listen(PORT, '0.0.0.0');
    startedOurOwn = true;
    await new Promise(r => setTimeout(r, 400));
  }

  try {
    // ------------------------------------------------------------------------
    // [STEP 1] Verify Frontend SPA Root (GET /)
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 1] Testing Root Frontend SPA (GET /)...');
    const resRoot = await fetch(`${baseUrl}/`);
    assert.strictEqual(resRoot.status, 200, 'Root should return HTTP 200');
    const html = await resRoot.text();
    assert.ok(html.includes('<div id="root"></div>'), 'HTML should contain React root container');
    assert.ok(html.includes('श्री सिद्धिविनायक मंदिर'), 'HTML should contain Mandir title in Marathi');
    console.log('  ✔ Frontend SPA index.html served cleanly with HTTP 200.\n');

    // ------------------------------------------------------------------------
    // [STEP 2] Verify Public Statistics API (GET /api/dashboard/public-stats)
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 2] Testing Public Statistics API (GET /api/public/stats)...');
    const resStats = await fetch(`${baseUrl}/api/public/stats`);
    assert.strictEqual(resStats.status, 200, 'Public stats should return HTTP 200');
    const stats = await resStats.json();
    assert.ok('verified_total_collection' in stats && 'verified_donors_count' in stats, 'Stats contains verified metrics');
    console.log(`  ✔ Public stats API returned verified metrics (Total: ₹${stats.verified_total_collection}, Donors: ${stats.verified_donors_count}).\n`);

    // ------------------------------------------------------------------------
    // [STEP 3] Verify UPI Configuration API (GET /api/upi/config)
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 3] Testing Institutional UPI Config (GET /api/upi/config)...');
    const resUpiConfig = await fetch(`${baseUrl}/api/upi/config`);
    assert.strictEqual(resUpiConfig.status, 200, 'UPI config should return HTTP 200');
    const upiConfig = await resUpiConfig.json();
    assert.ok(upiConfig.upi_id, 'UPI config must have upi_id');
    assert.ok(upiConfig.payee_name, 'UPI config must have payee_name');
    console.log(`  ✔ UPI config returned institutional VPA: ${upiConfig.upi_id} (${upiConfig.payee_name}).\n`);

    // ------------------------------------------------------------------------
    // [STEP 4] Verify Admin Authentication (POST /api/auth/login)
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 4] Testing Admin Authentication Login (POST /api/auth/login)...');
    // Ensure founder admin exists
    const adminMobile = process.env.ADMIN_MOBILE || '9987942399';
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'ShivamVedhSoham';

    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: adminMobile,
        password: adminPassword
      })
    });

    assert.strictEqual(resLogin.status, 200, 'Admin login should succeed with HTTP 200');
    const loginData = await resLogin.json();
    assert.ok(loginData.token, 'Login should return a valid JWT token');
    assert.strictEqual(loginData.user.role, 'ADMIN', 'User role must be ADMIN');
    const adminToken = loginData.token;
    console.log(`  ✔ Admin login succeeded as "${loginData.user.name}" (${loginData.user.role}).\n`);

    // ------------------------------------------------------------------------
    // [STEP 5] Verify Authenticated Admin UPI Contribution Listing
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 5] Testing Admin Authenticated UPI Listing (GET /api/upi/all)...');
    const resUpiAll = await fetch(`${baseUrl}/api/upi/all`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(resUpiAll.status, 200, 'Admin UPI listing should return HTTP 200');
    const upiAllData = await resUpiAll.json();
    assert.ok(Array.isArray(upiAllData.contributions), 'Contributions should be an array');
    console.log(`  ✔ Admin UPI endpoint returned ${upiAllData.contributions.length} recorded contribution(s).\n`);

    // ------------------------------------------------------------------------
    // [STEP 6] Verify Live WhatsApp Webhook Challenge Handshake (GET)
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 6] Testing Live WhatsApp Webhook Challenge Handshake (GET)...');
    const challengeCode = 'live_meta_challenge_7777';
    const resWebhookGet = await fetch(
      `${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=live_verify_token_999&hub.challenge=${challengeCode}`
    );
    assert.strictEqual(resWebhookGet.status, 200, 'Webhook GET should return HTTP 200');
    const challengeText = await resWebhookGet.text();
    assert.strictEqual(challengeText, challengeCode, 'Webhook should echo challenge code');
    console.log('  ✔ Meta Webhook GET handshake challenge echoed successfully.\n');

    // ------------------------------------------------------------------------
    // [STEP 7] Verify Live WhatsApp Webhook POST Signature & Event Processing
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 7] Testing Live WhatsApp Webhook POST HMAC-SHA256 Signature (POST)...');
    const webhookPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            statuses: []
          }
        }]
      }]
    });

    const hmacSig = crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
      .update(Buffer.from(webhookPayload))
      .digest('hex');

    const resWebhookPost = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${hmacSig}`
      },
      body: webhookPayload
    });

    assert.strictEqual(resWebhookPost.status, 200, 'Webhook POST should return HTTP 200');
    const webhookResponseText = await resWebhookPost.text();
    assert.strictEqual(webhookResponseText, 'EVENT_RECEIVED');
    console.log('  ✔ Webhook POST verified HMAC-SHA256 signature and acknowledged EVENT_RECEIVED.\n');

    // ------------------------------------------------------------------------
    // [STEP 8] Verify Live PDF Receipt Buffer Generation
    // ------------------------------------------------------------------------
    console.log('▶ [STEP 8] Testing Live A5 Receipt PDF Buffer Generation...');
    const { generateReceiptPdfBuffer } = await import('../services/pdfService.js');
    const pdfBuf = await generateReceiptPdfBuffer({
      receipt_no: 'EMM-2026-LIVE-001',
      donor_name: 'Live Devotee Test',
      donor_mobile: '9820012345',
      amount: 1001,
      payment_mode: 'Online UPI',
      upi_ref_no: 'UTR9988776655',
      amount_in_words: 'One Thousand One Rupees Only'
    });
    assert.ok(Buffer.isBuffer(pdfBuf), 'PDF output must be a Buffer');
    assert.ok(pdfBuf.length > 1000, `PDF length should be > 1KB (actual: ${pdfBuf.length} bytes)`);
    assert.strictEqual(pdfBuf.slice(0, 4).toString(), '%PDF', 'PDF buffer header must match %PDF');
    console.log(`  ✔ A5 Receipt PDF generated successfully (${pdfBuf.length} bytes, %PDF magic header valid).\n`);

    console.log('====================================================');
    console.log('🎉 ALL 8 LIVE SERVER & API CHECKS PASSED 100%!');
    console.log('====================================================\n');

  } finally {
    if (startedOurOwn && liveServer) {
      liveServer.close();
    }
  }
}

runLiveServerTest().catch((err) => {
  console.error('❌ Live Server Test FAILED:', err);
  process.exit(1);
});
