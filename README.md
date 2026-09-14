# 🚩 श्री सिद्धिविनायक मंदिर — Shree Siddhivinayak Mandir
### *सर्वसमावेशक मंदिर व्यवस्थापन, त्रिभाषी देणगी पावती व UPI देणगी प्रणाली*

---

## 📖 Project Overview

**श्री सिद्धिविनायक मंदिर (Shree Siddhivinayak Mandir / TempleWork)** is a devotional temple and mandal management application designed for transparent contribution collection, trilingual receipt generation (English, Hindi, Marathi), expense accounting, karyakarta directories, and secure manual UPI vargani processing.

---

## 🏛️ Temple Schedule & Sacred Timings

As defined in the central configuration:
* **मंदिर दर्शन (Daily Darshan)**: `06:00 AM – 10:00 PM`
* **सकाळची महाआरती (Morning Aarti)**: `8:00 AM`
* **संध्याकाळची महाआरती (Evening Aarti)**: `8:00 PM`

---

## 💳 Payment Architecture & Devotee Workflow

> **Note on Payment Verification Architecture:**
> The system implements a **manual UPI deeplink + UTR + administrator verification model**. It deliberately does not use external payment gateway SDKs (Razorpay/Stripe) or webhook callbacks. All verification is evidence-based and verified against actual bank statements by mandal trustees before an official paid receipt is minted.

### Devotee Workflow
1. **Fill Contribution Form**: Devotee enters Name, Mobile Number, Amount, and Category/Sankalp.
2. **UPI Intent Generated**: A unique reference (`INT-YYYY-XXXX`) and dynamic UPI deeplink/QR are generated.
3. **Payment via UPI App**: Devotee opens Google Pay, PhonePe, Paytm, BHIM, or CRED to complete the transfer.
4. **Submit UTR Reference**: Devotee inputs the 12-digit UPI Transaction ID (UTR). Duplicate UTRs are rejected by server-side validation and database unique constraints.
5. **Pending Verification**: The contribution enters `PENDING_VERIFICATION` status with a confirmation screen.
6. **Receipt Available**: Once verified by an administrator, the devotee views and downloads their official certificate in English, Hindi, or Marathi from the Devotee Portal.

### Administrator Workflow
1. **Secure Login**: Committee members log in using their 10-digit mobile number and password (with masked password fields and protected JWT sessions).
2. **Review Pending Contributions**: Administrator opens the UPI Verification Modal, equipped with instant search (by Name, Mobile, UTR, or Intent Ref) and bank evidence warning.
3. **Direct Review & Verification**: Administrator reviews donor details, amount, UTR, and submission timestamp against the mandal's bank statement, then confirms verification.
4. **Atomic Transaction**: An atomic database transaction creates an official paid receipt (`EMM-YYYY-XXXX`), transitions the contribution status to `VERIFIED`, increments the donor's lifetime total, and logs an audit trail event.
5. **Issue Receipt**: Administrator and devotee can immediately view, print, or share the trilingual certificate via WhatsApp.

---

## 📜 Trilingual Receipts (English, Hindi, Marathi)

Receipts support full trilingual rendering with zero missing glyphs using Google Fonts (`Noto Sans Devanagari` and `Rozha One`):
* **Trilingual Mode (Default)**: Combined Marathi, Hindi, and English labels on a single sacred gold-bordered certificate.
* **Language Switcher**: 1-click toggles between `सर्व (Trilingual)`, `मराठी`, `हिंदी`, and `English`.
* **Download & Sharing**: High-resolution A5 PDF download via `html2canvas` and `jsPDF`, plus pre-formatted multilingual WhatsApp sharing.

---

## 💻 Local Development

### Prerequisites
* Node.js v18+ (tested on v20 and v24)
* npm v9+

### Backend Setup
```bash
cd server
npm install
npm start            # Runs node src/index.js on port 5001
# Or for file watching:
npm run dev
```

### Frontend Setup
```bash
cd client
npm install
npm run dev          # Runs Vite development server on port 5173
```

### Production Build
```bash
# Build frontend and copy static bundle to server/public
npm run build --prefix client
```

---

## 🧪 Testing

Run the automated test suites:
```bash
# 1. Full Regression Suite (Groups A1-A3, B1-B3, C1-C10, Regression Flow)
node server/src/test/run_all_verifications.js

# 2. Client Improvements Suite (2024 Cleanup, Arti Timings, Trilingual Receipts, UTR Dedup, Admin UX)
node server/src/test/client_improvements_test.js
```

---

## 🔐 Environment Variables

Configure environment variables in your hosting provider dashboard or local `.env` file (refer to `server/.env.example`):

### Backend (`server/.env`)
* `NODE_ENV` — Environment mode (`production` or `development`)
* `PORT` — Server listening port (default: `5001` or host-assigned)
* `JWT_SECRET` — Strong secret key for signing session tokens (required in production)
* `FRONTEND_URL` — Allowed origin URL for CORS policy
* `MANDAL_NAME_MR` — Temple name in Marathi
* `MANDAL_NAME_EN` — Temple name in English
* `MANDAL_LOCATION_MR` — Temple location in Marathi
* `MANDAL_LOCATION_EN` — Temple location in English
* `MANDAL_REG_NO` — Government society registration number
* `MANDAL_YEAR` — Active operational year
* `MANDAL_UPI_ID` — Official mandal UPI virtual payment address
* `MANDAL_PAYEE_NAME` — Official beneficiary account name
* `DB_DIR` — Path to directory hosting `mandal.db`
* `UPLOAD_DIR` — Path to directory hosting uploaded expense bills

---

## 🌐 Production Deployment (Render / Docker)

The repository includes multi-stage [Dockerfile](Dockerfile) and [render.yaml](render.yaml) configurations:

* **Deployment Provider**: Render Web Service
* **Runtime**: Docker Multi-Stage Build
* **Persistent Disk Requirement**: SQLite requires persistent disk storage. In `render.yaml`, a 1GB persistent disk (`mandal-persistent-data`) is mounted to `/app/server/data` to ensure `mandal.db` and bill uploads survive container restarts.
* **Health Check Endpoint**: `GET /api/health` returns `200 OK` with server status and timestamp.
* **SPA Serving**: Express automatically serves compiled frontend assets from `/app/server/public` with full SPA route fallback (`/*` -> `index.html`).

---

## ⚠️ Known Limitations

1. **Receipt Sequential Numbering Concurrency**: The `MAX()`-based sequential numbering function (`generateReceiptNumber`) queries existing records inside the transaction. Under extreme simultaneous concurrency, a database-level `UNIQUE` constraint with retry logic provides ultimate isolation.
2. **SQLite Database Persistence**: Because SQLite is file-backed, hosting on serverless or ephemeral platforms without persistent disk mounts will reset data on container recycling. Always use persistent volumes or consider migrating to PostgreSQL for multi-region clustering.

---

## 📄 License & Rights
© 2026 **श्री सिद्धिविनायक मंदिर (MH/08/2024)**. All Rights Reserved.
