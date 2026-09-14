import { verifyWebhookSignature } from '../services/whatsappService.js';
import { handleWebhookStatusEvent } from '../services/whatsappNotificationService.js';

/**
 * Dedicated Meta WhatsApp Cloud API Webhook Controller.
 * 
 * Strict Architectural Rules:
 * 1. GET verifyWebhook: Validates hub.mode and hub.verify_token against WHATSAPP_VERIFY_TOKEN.
 * 2. POST processWebhook: Validates HMAC-SHA256 signature using req.rawBody and WHATSAPP_APP_SECRET.
 * 3. Fails closed in production if signature verification fails.
 * 4. Only webhook status events update SENT -> DELIVERED / READ / FAILED.
 * 5. Never log access tokens, App Secrets, or credentials.
 */

export function verifyWebhook(req, res) {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!expectedToken) {
      console.error('❌ Webhook configuration error: WHATSAPP_VERIFY_TOKEN is not configured.');
      return res.status(500).send('Webhook verify token is not configured on server.');
    }

    if (!mode || !token) {
      return res.status(400).send('Bad Request: Missing hub.mode or hub.verify_token.');
    }

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('✅ Meta WhatsApp webhook handshake verified successfully.');
      return res.status(200).send(challenge);
    }

    console.warn('⚠️  Meta WhatsApp webhook verification failed: Token mismatch or invalid mode.');
    return res.status(403).send('Forbidden: Webhook verification token mismatch.');
  } catch (err) {
    console.error('Webhook verification error:', err.message);
    res.status(500).send('Internal server error during webhook verification.');
  }
}

export const verifyWebhookChallenge = verifyWebhook;
export const handleIncomingWebhook = processWebhook;

export function processWebhook(req, res) {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Fail closed in production if signature cannot be verified
    const isSignatureValid = verifyWebhookSignature(req.rawBody, signature, appSecret);
    if (!isSignatureValid) {
      console.error('❌ Unauthorized webhook request: Invalid or missing X-Hub-Signature-256.');
      return res.status(401).json({ error: 'Unauthorized: Invalid webhook signature.' });
    }

    const body = req.body;

    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value && Array.isArray(value.statuses)) {
            for (const statusEvent of value.statuses) {
              handleWebhookStatusEvent(statusEvent);
            }
          }
        }
      }
      // Meta expects an immediate 200 OK
      return res.status(200).send('EVENT_RECEIVED');
    }

    res.status(404).send('Not Found');
  } catch (err) {
    console.error('Process webhook error:', err.message);
    // Still return 200 to acknowledge receipt to Meta and avoid infinite retries
    res.status(200).send('EVENT_RECEIVED_WITH_ERROR');
  }
}
