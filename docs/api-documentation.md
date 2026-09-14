# Shree Siddhivinayak Mandir — REST API Documentation

**Base URL**: `https://<your-domain>/api` (or `http://localhost:5001/api`)

---

## 1. Authentication Endpoints

### `POST /auth/login`
Authenticates an administrator or mandal member.
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "YourSecurePassword"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "jwt_token_string",
    "user": {
      "id": "usr-admin-uuid",
      "name": "Mandir Administrator",
      "name_mr": "मुख्य व्यवस्थापक",
      "mobile": "9000000000",
      "role": "ADMIN"
    }
  }
  ```

### `GET /auth/me`
Retrieves current authenticated profile from JWT bearer token.
- **Header:** `Authorization: Bearer <token>`
- **Response (200 OK):** User object.

---

## 2. Public Devotee Endpoints (No Auth Required)

### `GET /health`
Liveness and readiness health check probe.
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "environment": "production",
    "time": "2026-09-14T11:15:00.000Z",
    "mandal": "श्री सिद्धिविनायक मंदिर"
  }
  ```

### `GET /stats/public`
Aggregated transparency counts and totals for temple display.

### `GET /campaigns`
List of active donation sankalps (Ganeshotsav, Mandir Development, Mahaprasad).

### `GET /receipts/search/public?q=<query>`
Public certificate search by 10-digit mobile number or receipt number (`EMM-YYYY-XXXX`).

### `GET /public/receipts/:receipt_no/verify`
Direct QR verification endpoint for verifying receipt authenticity.

---

## 3. Manual UPI Payment & Verification Flow

### `GET /upi/config`
Retrieves official temple UPI ID (`siddhivinayak.mandir@upi`) and payee name.

### `POST /upi/initiate`
Initiates a devotee payment intent.
- **Request Body:**
  ```json
  {
    "donor_name": "Rahul Sharma",
    "donor_mobile": "9820098200",
    "amount": 501,
    "category_code": "GANESHOTSAV_2026",
    "address_galli": "Sector-5, Airoli",
    "notes": "Ganesh Jayanti Seva"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "intent_ref": "INT-2026-A1B2C3",
    "upi_deeplink": "upi://pay?pa=siddhivinayak.mandir@upi&pn=Shree%20Siddhivinayak%20Mandir&am=501&tr=INT-2026-A1B2C3&tn=INT-2026-A1B2C3"
  }
  ```

### `POST /upi/submit-utr`
Devotee submits the 12-digit bank transaction reference number.
- **Request Body:**
  ```json
  {
    "intent_ref": "INT-2026-A1B2C3",
    "upi_ref_no": "428912345678"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Transaction submitted for mandal admin verification.",
    "verification_status": "PENDING_VERIFICATION"
  }
  ```

---

## 4. Admin Management Endpoints (Require ADMIN Token)

### `GET /upi/all`
List all pending and historical UPI contributions with status filters.

### `POST /upi/:id/verify`
Admin verifies payment against bank statement.
- **Action:** Executes atomic transaction minting official receipt (`EMM-YYYY-XXXX`) and updating donor aggregates.

### `POST /upi/:id/reject`
Rejects invalid/fraudulent transaction references with an explanatory reason.

### `GET /reports/financial`
Full financial summary: paid total, unpaid total, expenses, and net balance.

### `GET /reports/receipts-csv`
Exports all receipts to UTF-8 CSV with Excel-compatible BOM.

### `GET /reports/audit-logs-csv`
Exports system audit trails to CSV.
