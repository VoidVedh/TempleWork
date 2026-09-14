# System Architecture & Security Specification

## 1. Architectural Philosophy

Shree Siddhivinayak Mandir was designed for community trust, zero vendor lock-in, and zero transaction fee leakage:

```
[Devotee Device]
       │
       ▼ (1. Fills Seva Sankalp Form)
[Public Devotee Portal]
       │
       ▼ (2. POST /api/upi/initiate)
[Intent Generator] ──► Row in upi_contributions (INITIATED)
       │
       ▼ (3. UPI Deeplink / Dynamic QR)
[GPay / PhonePe / BHIM / Paytm]
       │
       ▼ (4. Bank UPI Transfer)
[Temple Bank Account (PNB)]
       │
       ▼ (5. Devotee Submits 12-Digit UTR)
[POST /api/upi/submit-utr] ──► Status: PENDING_VERIFICATION
       │
       ▼ (6. Admin Checks Bank Statement)
[POST /api/upi/:id/verify] ──► Atomic DB Transaction:
                                 ├── Mint Official Receipt (EMM-YYYY-XXXX)
                                 ├── Update upi_contributions (VERIFIED)
                                 ├── Sync Donor Aggregates
                                 └── Record Immutable Audit Log
```

---

## 2. Security Safeguards

### A. Zero Gateway Vulnerability
- By avoiding third-party payment gateways (Razorpay, Stripe, Cashfree), the mandir saves 2-3% platform commission fees on every rupee donated by devotees.
- Devotee payments flow directly into the mandir's official Punjab National Bank account.

### B. Duplicate UTR Submission Protection
- Every submitted UTR is checked against a database UNIQUE constraint.
- Re-submitting an existing UTR immediately returns `HTTP 400 Bad Request`.

### C. Atomic Financial Invariants
- Admin verification uses SQLite transactions (`db.transaction(...)`).
- If any step fails during verification (e.g. receipt creation or donor total updating), the entire transaction rolls back completely.

### D. Multi-Tier Role-Based Access Control
- `ADMIN`: Full access to verify payments, add/remove trustees, and export logs.
- `TREASURER`: Read/write access to financial vouchers and expenses.
- `VOLUNTEER`: Access to record offline counter cash receipts.
- `DEVOTEE`: Public read-only receipt search and verification.

---

## 3. Localization Architecture

- The system natively supports three languages:
  1. **मराठी (Marathi)**: Primary official mandal language
  2. **हिंदी (Hindi)**: National language
  3. **English**: Universal access
- Receipts default to a unified **Trilingual Certificate** format, rendering all three languages simultaneously with Google Fonts (`Noto Sans Devanagari` and `Rozha One`).
