# 🚩 Current State Audit — Ekdant Mitra Mandal / Shree Siddhivinayak Mandir

**Date:** 2026-09-01  
**Auditor:** Lead Product & Architecture Engineer  
**Scope:** Full-stack Architecture, Security, Data Layer, UI/UX, and Performance Baseline  

---

## 1. Current Architecture Overview

| Layer | Technologies | Current Implementation |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 6, Lucide React, Canvas Confetti, jsPDF, html2canvas, QRCode | Single Page Application (SPA) with custom view-state switching (`currentView` in `App.jsx`). |
| **Backend** | Node.js (ESM), Express 4.21, Better-SQLite3, Multer, JWT, BcryptJS | RESTful API server with static SPA fallback and SQLite database storage in WAL mode. |
| **Database** | SQLite3 (`server/data/mandal.db`) | 9 relational tables: `users`, `receipts`, `expenses`, `audit_logs`, `mandal_settings`, `upi_contributions`, `donors`, `campaigns`, `bank_transactions`. |
| **Authentication** | Bearer JWT (HS256) | Token stored in `localStorage`, validated via `authMiddleware.js`. Passwords hashed with `bcryptjs` (salt rounds: 10). |
| **Styling** | Vanilla CSS (`index.css`, `certificate.css`) | Custom devotional theme with CSS variables (maroon `#7f1d1d`, saffron `#d97706`, gold `#d97706`). |
| **Deployment** | Docker / Render Blueprint (`render.yaml`) | Multi-stage Docker build, persistent disk mounted at `/app/server/data`. |

---

## 2. Existing Features & Functionality

1. **Public Devotee Portal**:
   - Bilingual support (मराठी / English) via context.
   - Campaign cards (Ganeshotsav 2024, Mandir Development, Mahaprasad, General).
   - Real-time UPI QR generation & Deep Link intents (`9029359525m@pnb`).
   - UTR submission & payment status tracker.
   - Public receipt search & certificate verification.
   - Public donor list with privacy protection.

2. **Administrative & Karyakarta Management Suite**:
   - **Dashboard**: Live financial totals (Total Collected, Pending Receipts, Expenses, Balance).
   - **New Receipt Generation**: Auspicious A5 digital receipt with Swastikas (`卐`), bilingual number-to-words converter, PDF generation, and WhatsApp sharing.
   - **Unpaid Receipts**: Status updates from Unpaid to Paid with permission gating (`can_change_payment_status`).
   - **Expense Manager**: Voucher generation, category breakdown, bill upload (Multer), and deletion authorization.
   - **Members & Leaderboard**: Karyakarta management, collection rankings, granular permissions.
   - **Financial Reports**: Payment mode breakdown, category distributions, UTF-8 BOM CSV exports.
   - **Audit Logs**: Immutable audit trail for system actions.

---

## 3. Existing API Endpoints & Routes

### Public Endpoints
* `GET /api/public/stats` — Summary figures of collections and donors
* `GET /api/public/campaigns` — Active mandal campaigns
* `GET /api/public/receipts/search` — Receipt verification query
* `GET /api/public/receipts/:id/verify` — Detailed public receipt view
* `POST /api/public/donations` — Initiate payment intent
* `POST /api/public/payments/utr` — Submit donor UTR
* `GET /api/public/payment-status/:identifier` — Check UTR verification status
* `GET /api/upi/config` — Payee UPI ID & metadata
* `GET /api/health` — System uptime and health

### Authenticated Endpoints
* `POST /api/auth/login` — Administrator & Member login
* `GET /api/auth/me` — Current session user info
* `POST /api/auth/logout` — Revoke session
* `GET /api/dashboard/stats` — Admin dashboard aggregations
* `GET /api/receipts` — Paginated receipts list
* `GET /api/receipts/:id` — Receipt by ID
* `POST /api/receipts` — Create new receipt
* `PATCH /api/receipts/:id/status` — Change payment status
* `PATCH /api/receipts/:id/cancel` — Cancel receipt (Admin only)
* `GET /api/expenses` — List expenses
* `POST /api/expenses` — Record expense with bill upload
* `DELETE /api/expenses/:id` — Delete expense voucher
* `GET /api/members` — Member directory & stats
* `POST /api/members` — Create new karyakarta
* `PUT /api/members/:id` — Update karyakarta permissions
* `DELETE /api/members/:id` — Remove karyakarta
* `GET /api/reports/financial` — Comprehensive financial ledger
* `GET /api/reports/receipts-csv` — Export receipts to CSV
* `GET /api/reports/expenses-csv` — Export expenses to CSV
* `GET /api/audit-logs` — Admin activity trail
* `GET /api/upi/pending` — List unverified UPI submissions
* `POST /api/upi/:id/verify` — Admin approves UTR and auto-issues receipt
* `POST /api/upi/:id/reject` — Admin rejects bogus UTR

---

## 4. Current State Gaps & Shortcomings

1. **Missing First-Class Event System**:
   - Events are currently not modeled in the database or exposed via dedicated public/admin pages.
   - No event lifecycle states (`UPCOMING`, `LIVE`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`), registrations, RSVP capacity, or calendar `.ics` integrations.

2. **Missing Real Announcement Engine**:
   - Announcements lack dedicated backend entities with priority (`NEW`, `IMPORTANT`, `UPDATED`, `EXPIRED`), expiry dates, and related event linkage.

3. **Missing Gallery & Album Architecture**:
   - No structured album hierarchy (e.g. Sthapana, Aarti, Cultural Events, Mahaprasad, Visarjan).
   - No lightbox / fullscreen viewer, lazy loading, album metadata, or admin photo upload system.

4. **Public Navigation & Information Architecture**:
   - Currently single-page monolithic view rather than dedicated, deep-linkable sections (`/events`, `/gallery`, `/announcements`, `/contribute`, `/about`, `/contact`).
   - Browser URL history does not reflect current sub-view.

5. **Role-Based Access Control (RBAC)**:
   - System currently only checks `ADMIN` vs `MEMBER` with two boolean flags. Needs extensible roles: `SUPER_ADMIN`, `ADMIN`, `EVENT_MANAGER`, `CONTENT_MANAGER`, `TREASURER`, `VIEW_ONLY`.

6. **Multilingual Architecture**:
   - Hindi is missing (currently only Marathi and English).
   - Some UI labels rely on hardcoded strings rather than comprehensive translation dictionary keys.

7. **User Experience & Loading/Error States**:
   - Skeletons, empty states, and error retries need standardizing across all views.
   - High-definition image assets were upgraded, but need responsive srcset and webp delivery for performance.

---

## 5. Security & Data Integrity Review

* **Authentication & Secrets**: Passwords are securely hashed with bcrypt (rounds: 10), JWT verification is enforced on all sensitive routes.
* **Payment Source of Truth**: UPI contributions require explicit admin verification of UTR numbers before receipts are marked `Paid`. No client-side fake payment confirmations.
* **SQL Injection**: Better-SQLite3 parameterized statements (`prepare(..).get/all/run`) are used everywhere.
* **File Uploads**: Multer is currently restricted to disk storage with unique filenames, but needs stricter MIME validation and extension checks for image security.

---

## 6. Recommendations & Action Plan

1. **P0**: Add database schema migrations for `events`, `event_registrations`, `announcements`, `albums`, `gallery_photos`, `notifications`.
2. **P0**: Implement robust backend controllers, routes, and RBAC authorization for Events, Announcements, Gallery, and Notifications.
3. **P1**: Build polished, devotional public pages for **Home**, **Events (with registrations & directions)**, **Gallery (with album filters & fullscreen viewer)**, **Announcements**, **Contribute**, **About**, and **Contact**.
4. **P1**: Build dedicated **User Portal** (My Contributions, Event Registrations, Notifications, Profile) and **Admin Management** (Events, Announcements, Albums, Media, RBAC Users, Audit Trail).
5. **P1**: Expand translation dictionary with full **Marathi, English, and Hindi (मराठी, English, हिंदी)** support.
6. **P2**: Add `.ics` Calendar integration, social sharing, and search.
7. **P2**: Run comprehensive automated & visual browser testing, ensure production build succeeds, and finalize documentation.
