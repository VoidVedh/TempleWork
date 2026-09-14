import './config/env.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/database.js';
import { ensureCleanProductionDatabase } from './config/initCleanDatabase.js';
import { login, getCurrentUser, logout } from './controllers/authController.js';
import { getDashboardStats, getPublicStats, getPublicCampaigns } from './controllers/dashboardController.js';
import { createReceipt, listReceipts, getReceiptById, updateReceiptStatus, searchPublicReceipts, verifyPublicReceipt, cancelReceipt } from './controllers/receiptController.js';
import { createExpense, listExpenses, deleteExpense } from './controllers/expenseController.js';
import { getMembersAndLeaderboard, getLeaderboard, createMember, updateMember, deleteMember } from './controllers/memberController.js';
import { getFinancialReports, getCategoryBreakdown, getPaymentModes, exportReceiptsCSV, exportExpensesCSV, exportAuditLogsCSV } from './controllers/reportController.js';
import { getAuditLogs } from './controllers/auditController.js';
import { getUpiConfig, initiatePaymentIntent, submitUpiContribution, checkContributionStatus, listPendingContributions, listAllContributions, verifyContribution, rejectContribution, retryWhatsAppReceipt, getWhatsAppStatus } from './controllers/upiController.js';
import { verifyWebhook, processWebhook } from './controllers/whatsappWebhookController.js';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from './controllers/notificationController.js';
import { authenticateToken, optionalAuth, requireAdmin, requireTreasurer, requireExpenseAuthority, requirePaymentStatusAuthority } from './middlewares/authMiddleware.js';
import { upload } from './middlewares/uploadMiddleware.js';

import { loginLimiter, donationIntentLimiter, utrSubmissionLimiter, receiptSearchLimiter } from './middlewares/rateLimiter.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Defensive Blue Team Hardening: Disable Express header fingerprint
app.disable('x-powered-by');

// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      process.env.CLIENT_ORIGIN,
      'https://ekdant-mitra-mandal.onrender.com',
      'https://shree-siddhivinayak-mandir.onrender.com'
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

// Comprehensive Security HTTP headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing with safe limits and raw body buffer preservation for webhook signature verification
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static uploads folder
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Initialize Database in Clean Production State
ensureCleanProductionDatabase();

// --- API ROUTES ---

// 0. Public Devotee & Transparency Routes (No Authentication Required)
app.get('/api/public/stats', getPublicStats);
app.get('/api/public/campaigns', getPublicCampaigns);
app.get('/api/public/receipts/search', receiptSearchLimiter, searchPublicReceipts);
app.get('/api/public/receipts/:id/verify', verifyPublicReceipt);
app.post('/api/public/donations', donationIntentLimiter, initiatePaymentIntent);
app.post('/api/public/payments/utr', utrSubmissionLimiter, submitUpiContribution);
app.get('/api/public/payment-status/:identifier', checkContributionStatus);

// 1. Auth Routes
app.post('/api/auth/login', loginLimiter, login);
app.get('/api/auth/me', authenticateToken, getCurrentUser);
app.post('/api/auth/logout', authenticateToken, logout);

// 1b. Devotee User Space
app.get('/api/notifications', optionalAuth, getUserNotifications);
app.post('/api/notifications/:id/read', optionalAuth, markNotificationRead);
app.post('/api/notifications/read-all', optionalAuth, markAllNotificationsRead);

// 2. Dashboard Stats (Admin / Staff)
app.get('/api/dashboard/stats', authenticateToken, getDashboardStats);

// 3. Receipts Routes
app.get('/api/receipts', authenticateToken, listReceipts);
app.get('/api/receipts/:id', authenticateToken, getReceiptById);
app.post('/api/receipts', authenticateToken, createReceipt);
app.patch('/api/receipts/:id/status', authenticateToken, requirePaymentStatusAuthority, updateReceiptStatus);
app.patch('/api/receipts/:id/cancel', authenticateToken, requireAdmin, cancelReceipt);

// 4. Expenses Routes
app.get('/api/expenses', authenticateToken, listExpenses);
app.post('/api/expenses', authenticateToken, requireExpenseAuthority, upload.single('bill_attachment'), createExpense);
app.delete('/api/expenses/:id', authenticateToken, requireExpenseAuthority, deleteExpense);

// 5. Members & Leaderboard Routes
app.get('/api/members', authenticateToken, getMembersAndLeaderboard);
app.get('/api/members/leaderboard', authenticateToken, getLeaderboard);
app.post('/api/members', authenticateToken, requireAdmin, createMember);
app.put('/api/members/:id', authenticateToken, requireAdmin, updateMember);
app.delete('/api/members/:id', authenticateToken, requireAdmin, deleteMember);

// 6. Reports & CSV Routes
app.get('/api/reports/financial', authenticateToken, getFinancialReports);
app.get('/api/reports/category-breakdown', authenticateToken, getCategoryBreakdown);
app.get('/api/reports/payment-modes', authenticateToken, getPaymentModes);
app.get('/api/reports/receipts-csv', authenticateToken, exportReceiptsCSV);
app.get('/api/reports/expenses-csv', authenticateToken, exportExpensesCSV);
app.get('/api/reports/export/receipts', authenticateToken, exportReceiptsCSV);
app.get('/api/reports/export/expenses', authenticateToken, exportExpensesCSV);
app.get('/api/reports/audit-logs-csv', authenticateToken, requireAdmin, exportAuditLogsCSV);
app.get('/api/reports/export/audit-logs', authenticateToken, requireAdmin, exportAuditLogsCSV);

// 7. Audit Log Routes (Admin Only)
app.get('/api/audit-logs', authenticateToken, requireAdmin, getAuditLogs);

// 8. UPI Contribution Routes
app.get('/api/upi/config', getUpiConfig);
app.post('/api/upi/initiate', donationIntentLimiter, initiatePaymentIntent);
app.post('/api/upi/submit-utr', utrSubmissionLimiter, submitUpiContribution);
app.get('/api/upi/status/:identifier', checkContributionStatus);
app.get('/api/upi/pending', authenticateToken, requireAdmin, listPendingContributions);
app.get('/api/upi/all', authenticateToken, requireAdmin, listAllContributions);
app.post('/api/upi/:id/verify', authenticateToken, requireAdmin, verifyContribution);
app.post('/api/upi/:id/reject', authenticateToken, requireAdmin, rejectContribution);
app.post('/api/upi/:id/retry-whatsapp', authenticateToken, requireAdmin, retryWhatsAppReceipt);
app.get('/api/upi/:id/whatsapp-status', authenticateToken, requireAdmin, getWhatsAppStatus);

// 9. Meta WhatsApp Cloud API Webhook Routes (Public for Meta with HMAC validation)
app.get('/api/webhooks/whatsapp', verifyWebhook);
app.post('/api/webhooks/whatsapp', processWebhook);

// 10. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
    mandal: process.env.MANDAL_NAME_MR || 'श्री सिद्धिविनायक मंदिर'
  });
});



// Resolve frontend static assets directory
function resolveFrontendPath() {
  const candidates = [
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), '../client/dist'),
    '/app/server/public',
    '/app/client/dist'
  ];

  for (const candidate of candidates) {
    const checkFile = path.join(candidate, 'index.html');
    if (fs.existsSync(checkFile)) {
      return candidate;
    }
  }
  return path.resolve(__dirname, '../public');
}

const clientDistPath = resolveFrontendPath();
const indexPath = path.join(clientDistPath, 'index.html');
const hasIndex = fs.existsSync(indexPath);

console.log('====================================================');
console.log(`📁 Static Assets Directory: ${clientDistPath}`);
console.log(`📄 index.html Present: ${hasIndex ? 'YES' : 'NO'}`);
console.log('====================================================');

// 10. Serve static frontend assets
app.use(express.static(clientDistPath, { index: 'index.html' }));

// 11. Fallback all non-API GET requests to index.html (SPA routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('SPA index.html not found. Please ensure frontend is built.');
});

// Error handling middleware (Safe, non-leaking)
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  res.status(status).json({
    error: isProd && status === 500 
      ? 'सर्व्हर त्रुटी उद्भवली. कृपया नंतर प्रयत्न करा (Internal server error occurred).' 
      : (err.message || 'Internal server error occurred.')
  });
});

// Start Server on 0.0.0.0 for Cloud / Docker / Render compatibility
const HOST = '0.0.0.0';
let server = null;
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMainModule || process.env.AUTO_START_SERVER === 'true') {
  server = app.listen(PORT, HOST, () => {
    console.log(`🚩 Shree Siddhivinayak Mandir Production API Server running on http://${HOST}:${PORT}`);
  });
}

export default app;
export { app, server };
