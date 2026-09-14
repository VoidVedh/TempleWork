# Meta WhatsApp Cloud API Production Setup & Operator Runbook

This document provides the complete, step-by-step onboarding, configuration, and security runbook for integrating the **Meta WhatsApp Cloud API** with **TempleWork (Shree Siddhivinayak Mandir Management System)**.

---

## 1. Architectural Model & Trust Boundary

In this architecture:
- **The Client / Temple Trust owns the Meta Business Portfolio, WhatsApp Business Account (WABA), and the official WhatsApp phone number.**
- **The TempleWork Application handles payment confirmation, A5 PDF receipt generation, transactional outbox queuing, dispatch to Meta, and webhook status tracking.**
- **Zero Secrets Commitment**: No OTPs, 6-digit registration PINs, System User Access Tokens, or App Secrets are ever committed to source code or logged to console/files.

---

## 2. Meta Business Portfolio & WhatsApp Business Account (WABA)

### Step 2.1: Register or Access Meta Business Manager
1. Navigate to [Meta Business Suite](https://business.facebook.com/).
2. Log in using the temple trustee/administrator account.
3. Ensure the business entity name matches the official temple trust registration:
   * **Organization Name**: Shree Siddhivinayak Mandir Trust (or Ekdant Mitra Mandal)
   * **Registration Number**: Official trust registration number (e.g., `MH/08/2026`)
   * **Official Website / Domain**: Verified domain for the temple trust.

### Step 2.2: Create / Select a WhatsApp Business Account (WABA)
1. Go to **Business Settings** → **Accounts** → **WhatsApp Accounts**.
2. Click **Add** → **Create a WhatsApp Business Account**.
3. Select account currency (e.g., `INR - Indian Rupee`) and time zone (`Asia/Kolkata`).
4. Note your **WhatsApp Business Account ID (WABA ID)** for administrative reference.

---

## 3. Phone Number Setup & Registration

### Step 3.1: Add the Temple Phone Number
1. Under your WABA in Meta Business Manager, go to **WhatsApp Manager** → **Account Tools** → **Phone Numbers**.
2. Click **Add Phone Number**.
3. Enter:
   * **Display Name**: `Shree Siddhivinayak Mandir` (must match temple branding guidelines).
   * **Category**: `Non-Profit` or `Religious Organization`.
   * **Business Description**: Official Mandir Devotee Service & Donation Desk.
   * **Phone Number**: The dedicated temple mobile number (e.g., `+91 98XXXXXXXX`).
4. Verify the number via SMS or Voice Call OTP.

> [!CAUTION]
> **CRITICAL SECURITY WARNING REGARDING 6-DIGIT REGISTRATION PIN**:
> During phone registration or Two-Step Verification, Meta will ask for a **6-Digit Registration PIN**.
> - **NEVER** share this PIN with developers, contractors, or external parties.
> - **NEVER** type or save this PIN into `.env` files, configuration files, or database records.
> - This PIN is exclusively used in the Meta Business Manager interface or on physical device registration to protect the temple's WhatsApp number from SIM-swap hijacking.

---

## 4. Meta App Creation & Permanent System User Token

### Step 4.1: Create Meta Developer App
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Click **My Apps** → **Create App**.
3. Select **Other** → **Business** as the app type.
4. App Name: `TempleWork-Receipts-Integration`.
5. Associate with your Meta Business Portfolio.
6. Add the **WhatsApp** product to your app.

### Step 4.2: Retrieve Phone Number ID and App Secret
1. In the App Dashboard, go to **WhatsApp** → **API Setup**.
2. Locate the **Phone Number ID** (a numeric string like `105948295837261`).
   * Copy this as `WHATSAPP_PHONE_NUMBER_ID`.
3. In the sidebar, go to **App Settings** → **Basic**.
4. Click **Show** next to **App Secret**.
   * Copy this as `WHATSAPP_APP_SECRET` (used for POST webhook HMAC-SHA256 verification).

### Step 4.3: Generate Permanent System User Access Token
> [!IMPORTANT]
> The temporary token generated in API Setup expires in 24 hours. Production deployment requires a **Permanent System User Token**.

1. In Meta Business Manager, navigate to **Business Settings** → **Users** → **System Users**.
2. Click **Add** → Name: `TempleWork-Bot-User`, Role: `Admin` (or `Employee`).
3. Click **Add Assets**:
   * Assign the **TempleWork-Receipts-Integration** App with **Full Control**.
   * Assign the **WhatsApp Business Account** with **Full Control**.
4. Click **Generate New Token**:
   * Select App: `TempleWork-Receipts-Integration`.
   * Token Expiration: **Never** (Permanent).
   * Select required permissions:
     * `whatsapp_business_messaging`
     * `whatsapp_business_management`
5. Click **Generate Token** and copy the token value immediately.
   * Save this as `WHATSAPP_ACCESS_TOKEN`.

---

## 5. WhatsApp Message Template Creation

Meta requires business-initiated messages to follow pre-approved templates.

### Template Specifications: `temple_payment_receipt`
1. In Meta WhatsApp Manager, navigate to **Account Tools** → **Message Templates**.
2. Click **Create Template**:
   * **Category**: `Utility`
   * **Name**: `temple_payment_receipt`
   * **Language**: `English (US)` (`en_US`) or `Marathi` (`mr`).
3. **Header**:
   * Format: **Media** → **Document**
   * Sample File: Upload a sample receipt PDF (A5 format).
4. **Body**:
```text
॥ श्री गणेशाय नमः ॥
Jay Ganesh, {{1}}!

We gratefully acknowledge your holy contribution of Rs. {{2}} to Shree Siddhivinayak Mandir (Reg No: MH/08/2026).

Receipt Number: {{3}}
Payment Mode: {{4}}
Transaction Ref (UTR): {{5}}

Your official digital tax/donation receipt is attached above. May Lord Ganesha shower prosperity, peace, and health upon your family.
॥ गणपती बाप्पा मोरया ॥
```
5. **Sample Values for Approval**:
   * `{{1}}`: Ramesh Sharma
   * `{{2}}`: 501
   * `{{3}}`: EMM-2026-0042
   * `{{4}}`: Online UPI
   * `{{5}}`: 426810982341
6. **Footer** (Optional): `Shree Siddhivinayak Mandir Trust`
7. Click **Submit for Review**. Approval usually takes 1 to 15 minutes for Utility templates.

---

## 6. Webhook Configuration

TempleWork provides a hardened webhook endpoint to receive real-time message status updates (`sent`, `delivered`, `read`, `failed`).

### Step 6.1: Webhook URL & Handshake
* **Callback URL**: `https://<YOUR-RENDER-SERVICE-NAME>.onrender.com/api/webhooks/whatsapp`
* **Verify Token**: A strong random string generated by you (e.g., `crypto.randomBytes(32).toString('hex')`). Save this as `WHATSAPP_VERIFY_TOKEN`.

### Step 6.2: Configure in Meta App Dashboard
1. Go to **WhatsApp** → **Configuration** → **Webhook**.
2. Click **Edit**:
   * Enter the **Callback URL**.
   * Enter the **Verify Token**.
3. Click **Verify and Save**. (TempleWork's GET handler will validate `hub.verify_token` and respond with `hub.challenge`).
4. Under **Webhook Fields**, click **Manage** and subscribe to:
   * **`messages`** (covers message status updates and delivery receipts).

> [!NOTE]
> All incoming POST webhook payloads are verified by TempleWork using HMAC-SHA256 against `WHATSAPP_APP_SECRET` and `req.rawBody`. If the signature does not match or the secret is missing, production requests fail closed with HTTP 401.

---

## 7. Render & Production Environment Variables

Configure the following environment variables in your deployment environment (e.g., Render Dashboard → Environment Variables):

| Variable Name | Required | Example / Format | Purpose |
| :--- | :--- | :--- | :--- |
| `META_GRAPH_API_VERSION` | **Yes** | `v21.0` | Meta Graph API Version (strictly configured, never hard-coded). |
| `WHATSAPP_PHONE_NUMBER_ID` | **Yes** | `105948295837261` | Meta Sender Phone Number ID. |
| `WHATSAPP_ACCESS_TOKEN` | **Yes** | `EAA...` (Permanent System User Token) | Authorization bearer token for Graph API. |
| `WHATSAPP_VERIFY_TOKEN` | **Yes** | `<random-hex-string>` | Secret token for GET webhook verification challenge. |
| `WHATSAPP_APP_SECRET` | **Yes** | `<meta-app-secret-hex>` | Secret used to verify `X-Hub-Signature-256` on POST webhooks. |
| `WHATSAPP_RECEIPT_TEMPLATE_NAME` | No | `temple_payment_receipt` | Template name approved in Meta WhatsApp Manager (default: `temple_payment_receipt`). |
| `WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE` | No | `en_US` | Language code for the template (default: `en_US`). |
| `WHATSAPP_WEBHOOK_ENABLED` | No | `true` | Enables or disables webhook processing (default: `true`). |

---

## 8. Operational Verification & Troubleshooting

### Verifying Delivery in Admin UI
1. Log into the TempleWork Admin Dashboard.
2. Open **UPI Contributions** (`/admin`).
3. Click **तपासणी व पुष्टी (Review & Verify)** on any pending contribution.
4. When verified:
   * Receipt is generated and stored in SQLite.
   * A notification entry is added to `whatsapp_notifications` with status `QUEUED`.
   * Background outbox dispatcher uploads the A5 PDF to Meta `/media`, then sends the template message.
   * Status transitions:
     * `QUEUED` → `PROCESSING` (DB Concurrency Lock)
     * `SENT` (Meta returned `wamid`)
     * `DELIVERED` (Webhook confirmed delivered to devotee phone)
     * `READ` (Webhook confirmed devotee opened the message)
5. Switch to the **सत्यापित (Verified)** tab in the modal:
   * View live delivery badges (`🚀 मेटाने स्वीकारले`, `📬 पोहचले`, `👀 वाचले`, `⚠️ अयशस्वी`).
   * If failed, click **पुन्हा पाठवा (Retry)** to re-dispatch without affecting payment status.
   * Click **पावती पहा (View Receipt)** to view or print the official certificate.

### Common Troubleshooting Scenarios

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| Status stuck at `FAILED` with code `100` / `131030` | Devotee phone number not registered on WhatsApp or invalid format. | Verify phone number in Admin UI. The system automatically normalizes 10-digit Indian numbers (`98XXXXXXXX` → `9198XXXXXXXX`). |
| Status stuck at `FAILED` with code `132000` | Template name or language mismatch. | Verify `WHATSAPP_RECEIPT_TEMPLATE_NAME` and `WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE` match your Meta approved template. |
| Webhook verification fails (HTTP 403) | `WHATSAPP_VERIFY_TOKEN` mismatch in Meta App settings. | Ensure exact match between Render environment variable and Meta Webhook setup dialog. |
| Webhook POST returns HTTP 401 | Invalid HMAC-SHA256 signature or wrong `WHATSAPP_APP_SECRET`. | Ensure `WHATSAPP_APP_SECRET` in `.env` is copied directly from Meta App Dashboard Basic Settings. |
| Graph API returns HTTP 401 | Access token expired or invalid permissions. | Generate a Permanent System User Token with `whatsapp_business_messaging` permissions in Business Settings. |

---

*Document Version: 1.0 (September 2026)*  
*Maintained by: Shree Siddhivinayak Mandir Engineering & Operations*
