import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase } from './config/database.js';
import { ensureCleanProductionDatabase } from './config/initCleanDatabase.js';
import { login, getCurrentUser, logout } from './controllers/authController.js';
import { getDashboardStats } from './controllers/dashboardController.js';
import { createReceipt, listReceipts, getReceiptById, updateReceiptStatus } from './controllers/receiptController.js';
import { createExpense, listExpenses, deleteExpense } from './controllers/expenseController.js';
import { getMembersAndLeaderboard, createMember, updateMember, deleteMember } from './controllers/memberController.js';
import { getFinancialReports, exportReceiptsCSV, exportExpensesCSV } from './controllers/reportController.js';
import { getAuditLogs } from './controllers/auditController.js';
import { getUpiConfig, initiatePaymentIntent, submitUpiContribution, checkContributionStatus, listPendingContributions, listAllContributions, verifyContribution, rejectContribution } from './controllers/upiController.js';
import { authenticateToken, requireAdmin, requireExpenseAuthority, requirePaymentStatusAuthority } from './middlewares/authMiddleware.js';
import { upload } from './middlewares/uploadMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration - Permissive for same-origin and mobile webviews
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing with safe limits
app.use(express.json({ limit: '2mb' }));
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

// 1. Auth Routes
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateToken, getCurrentUser);
app.post('/api/auth/logout', authenticateToken, logout);

// 2. Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, getDashboardStats);

// 3. Receipts Routes
app.get('/api/receipts', authenticateToken, listReceipts);
app.get('/api/receipts/:id', authenticateToken, getReceiptById);
app.post('/api/receipts', authenticateToken, createReceipt);
app.patch('/api/receipts/:id/status', authenticateToken, requirePaymentStatusAuthority, updateReceiptStatus);

// 4. Expenses Routes
app.get('/api/expenses', authenticateToken, listExpenses);
app.post('/api/expenses', authenticateToken, requireExpenseAuthority, upload.single('bill_attachment'), createExpense);
app.delete('/api/expenses/:id', authenticateToken, requireExpenseAuthority, deleteExpense);

// 5. Members & Leaderboard Routes
app.get('/api/members', authenticateToken, getMembersAndLeaderboard);
app.get('/api/members/leaderboard', authenticateToken, (req, res) => {
  getMembersAndLeaderboard(req, {
    json: (data) => res.json({ leaderboard: data.leaderboard })
  });
});
app.post('/api/members', authenticateToken, requireAdmin, createMember);
app.put('/api/members/:id', authenticateToken, requireAdmin, updateMember);
app.delete('/api/members/:id', authenticateToken, requireAdmin, deleteMember);

// 6. Reports & CSV Routes
app.get('/api/reports/financial', authenticateToken, getFinancialReports);
app.get('/api/reports/category-breakdown', authenticateToken, (req, res) => {
  getFinancialReports(req, {
    json: (data) => res.json({ categories: data.category_breakdown })
  });
});
app.get('/api/reports/payment-modes', authenticateToken, (req, res) => {
  getFinancialReports(req, {
    json: (data) => res.json({ payment_modes: data.payment_modes })
  });
});
app.get('/api/reports/receipts-csv', authenticateToken, exportReceiptsCSV);
app.get('/api/reports/expenses-csv', authenticateToken, exportExpensesCSV);
app.get('/api/reports/export/receipts', authenticateToken, exportReceiptsCSV);
app.get('/api/reports/export/expenses', authenticateToken, exportExpensesCSV);

// 7. Audit Log Routes (Admin Only)
app.get('/api/audit-logs', authenticateToken, requireAdmin, getAuditLogs);

// 8. UPI Contribution Routes
app.get('/api/upi/config', getUpiConfig);
app.post('/api/upi/initiate', initiatePaymentIntent);
app.post('/api/upi/submit-utr', submitUpiContribution);
app.get('/api/upi/status/:identifier', checkContributionStatus);
app.get('/api/upi/pending', authenticateToken, requireAdmin, listPendingContributions);
app.get('/api/upi/all', authenticateToken, listAllContributions);
app.post('/api/upi/:id/verify', authenticateToken, requireAdmin, verifyContribution);
app.post('/api/upi/:id/reject', authenticateToken, requireAdmin, rejectContribution);

// 9. Health Check
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.'
  });
});

// Start Server on 0.0.0.0 for Cloud / Docker / Render compatibility
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚩 Shree Siddhivinayak Mandir Production API Server running on http://${HOST}:${PORT}`);
});
