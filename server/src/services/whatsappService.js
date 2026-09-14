import crypto from 'crypto';

/**
 * Pure transport service for Meta WhatsApp Cloud API.
 * 
 * Strict Architectural Rules:
 * 1. META_GRAPH_API_VERSION must be explicitly configured; no hard-coded fallback version.
 * 2. WHATSAPP_VERIFY_TOKEN is strictly for GET handshake.
 * 3. WHATSAPP_APP_SECRET is strictly for POST HMAC-SHA256 signature verification.
 * 4. Raw request body buffer is used for HMAC verification.
 * 5. Successful Meta dispatch transitions to SENT only (wamid recorded).
 * 6. Never log access tokens, App Secrets, or credentials.
 */

export function getGraphApiVersion() {
  const version = process.env.META_GRAPH_API_VERSION;
  if (!version) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('META_GRAPH_API_VERSION environment variable is required in production and is not configured.');
    }
    // In dev / test, require explicit definition or pass from caller
    throw new Error('META_GRAPH_API_VERSION environment variable must be configured (e.g. v21.0).');
  }
  return version.startsWith('v') ? version : `v${version}`;
}

export function getWhatsAppConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    templateName: process.env.WHATSAPP_RECEIPT_TEMPLATE_NAME || 'temple_payment_receipt',
    templateLanguage: process.env.WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE || 'en_US',
    templeName: process.env.MANDAL_NAME_MR || process.env.MANDAL_NAME_EN || 'श्री सिद्धिविनायक मंदिर'
  };
}

/**
 * Normalizes phone numbers for WhatsApp messaging.
 * Default country is India (calling code 91).
 * 
 * Accepts:
 * - "9820012345" -> "919820012345"
 * - "+919820012345" -> "919820012345"
 * - "09820012345" -> "919820012345"
 * - "+1 (555) 123-4567" with countryCode='US' -> "15551234567"
 */
export function normalizePhoneNumber(rawPhone, countryCode = 'IN') {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new Error('Invalid phone number: Phone number is empty or not a string.');
  }

  const trimmed = rawPhone.trim();
  const startsWithPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    throw new Error('Invalid phone number: No numeric digits found.');
  }

  // If number starts with '+', it is explicitly prefixed with international country code
  if (startsWithPlus) {
    if (digits.length >= 8 && digits.length <= 15) {
      return digits;
    }
    throw new Error(`Invalid international phone number: ${rawPhone}`);
  }

  const upperCountry = countryCode.toUpperCase();

  if (upperCountry === 'IN') {
    // Indian standard: 10 digits mobile starting with 6, 7, 8, 9
    if (digits.length === 10) {
      if (!/^[6-9]\d{9}$/.test(digits)) {
        throw new Error(`Invalid Indian mobile number: ${digits}. Must start with 6, 7, 8, or 9.`);
      }
      return `91${digits}`;
    }
    // 11 digits starting with 0 (e.g. 09820012345)
    if (digits.length === 11 && digits.startsWith('0')) {
      const core = digits.slice(1);
      if (!/^[6-9]\d{9}$/.test(core)) {
        throw new Error(`Invalid Indian mobile number: ${digits}.`);
      }
      return `91${core}`;
    }
    // 12 digits starting with 91 (e.g. 919820012345)
    if (digits.length === 12 && digits.startsWith('91')) {
      const core = digits.slice(2);
      if (!/^[6-9]\d{9}$/.test(core)) {
        throw new Error(`Invalid Indian mobile number: ${digits}.`);
      }
      return digits;
    }
    throw new Error(`Invalid Indian phone number length (${digits.length} digits): ${rawPhone}`);
  }

  // Generic international fallback mapping
  const countryPrefixes = {
    'US': '1',
    'CA': '1',
    'GB': '44',
    'AE': '971',
    'SG': '65',
    'AU': '61'
  };

  const prefix = countryPrefixes[upperCountry];
  if (prefix && !digits.startsWith(prefix) && digits.length >= 7 && digits.length <= 10) {
    return `${prefix}${digits}`;
  }

  // Already includes country code
  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  throw new Error(`Unable to normalize phone number: ${rawPhone} for country: ${countryCode}`);
}

/**
 * Validates Meta Webhook Signature (X-Hub-Signature-256) using HMAC-SHA256
 * over the raw request body buffer.
 * 
 * Fails closed in production if signature, secret, or raw body is missing.
 */
export function verifyWebhookSignature(rawBodyBuffer, signatureHeader, appSecret) {
  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Webhook security error: WHATSAPP_APP_SECRET is not configured in production.');
      return false;
    }
    console.warn('⚠️  Webhook signature verification skipped in dev: WHATSAPP_APP_SECRET not set.');
    return true;
  }

  if (!rawBodyBuffer || !Buffer.isBuffer(rawBodyBuffer)) {
    console.error('❌ Webhook security error: Raw request body buffer is missing.');
    return false;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    console.error('❌ Webhook security error: X-Hub-Signature-256 header missing or malformed.');
    return false;
  }

  const clientSignature = signatureHeader.slice(7); // strip 'sha256='
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(rawBodyBuffer);
  const expectedSignature = hmac.digest('hex');

  const clientBuf = Buffer.from(clientSignature, 'hex');
  const expectedBuf = Buffer.from(expectedSignature, 'hex');

  if (clientBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(clientBuf, expectedBuf);
}

/**
 * Uploads a document (PDF receipt) to Meta Cloud API /media endpoint.
 * Returns media_id string.
 */
export async function uploadMedia(pdfBuffer, filename = 'receipt.pdf', mimeType = 'application/pdf') {
  const version = getGraphApiVersion();
  const config = getWhatsAppConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    throw new Error('Meta WhatsApp credentials missing: WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be configured.');
  }

  const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
  const crlf = '\r\n';

  let bodyHeader = `--${boundary}${crlf}`;
  bodyHeader += `Content-Disposition: form-data; name="messaging_product"${crlf}${crlf}`;
  bodyHeader += `whatsapp${crlf}`;

  bodyHeader += `--${boundary}${crlf}`;
  bodyHeader += `Content-Disposition: form-data; name="file"; filename="${filename}"${crlf}`;
  bodyHeader += `Content-Type: ${mimeType}${crlf}${crlf}`;

  const bodyFooter = `${crlf}--${boundary}--${crlf}`;

  const payload = Buffer.concat([
    Buffer.from(bodyHeader, 'utf8'),
    pdfBuffer,
    Buffer.from(bodyFooter, 'utf8')
  ]);

  const url = `https://graph.facebook.com/${version}/${config.phoneNumberId}/media`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(payload.length)
    },
    body: payload
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id) {
    const errMsg = data.error?.message || `HTTP ${response.status} failed to upload media`;
    const errCode = data.error?.code || response.status;
    const error = new Error(`Meta Media Upload Failed: ${errMsg} (code ${errCode})`);
    error.code = errCode;
    error.metaError = data.error;
    throw error;
  }

  return data.id;
}

/**
 * Sends approved WhatsApp receipt template message with document header to devotee.
 * Returns { success: true, meta_message_id: wamid } on HTTP 200.
 */
export async function sendReceiptTemplate({
  recipientPhone,
  donorName,
  receiptNo,
  amount,
  mediaId,
  filename = 'Official_Receipt.pdf'
}) {
  const version = getGraphApiVersion();
  const config = getWhatsAppConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    throw new Error('Meta WhatsApp credentials missing: WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be configured.');
  }

  const normalizedTo = normalizePhoneNumber(recipientPhone);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedTo,
    type: 'template',
    template: {
      name: config.templateName,
      language: {
        code: config.templateLanguage
      },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                id: mediaId,
                filename: filename
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: donorName },
            { type: 'text', text: config.templeName },
            { type: 'text', text: receiptNo },
            { type: 'text', text: Number(amount).toLocaleString('en-IN') }
          ]
        }
      ]
    }
  };

  const url = `https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.messages || !data.messages[0]?.id) {
    const errMsg = data.error?.message || `HTTP ${response.status} failed to send message`;
    const errCode = data.error?.code || response.status;
    const error = new Error(`Meta Message Send Failed: ${errMsg} (code ${errCode})`);
    error.code = errCode;
    error.metaError = data.error;
    throw error;
  }

  // Returns wamid
  return {
    success: true,
    meta_message_id: data.messages[0].id
  };
}
