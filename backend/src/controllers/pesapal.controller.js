import crypto from 'crypto';
import firebaseAdmin from '../services/firebaseAdmin.js';

const PAID_AMOUNT = Number(process.env.PAID_AMOUNT || 1);

// Read from env at runtime (not at module load) so Railway env vars are picked up even if process is already running
function getConsumerKey() {
  return process.env.PESAPAL_CONSUMER_KEY || process.env.PESAPAL_KEY || process.env.PESAPAL_API_KEY;
}

function getConsumerSecret() {
  return process.env.PESAPAL_CONSUMER_SECRET || process.env.PESAPAL_SECRET || process.env.PESAPAL_API_SECRET;
}

function getPesapalIpnId() {
  return process.env.PESAPAL_IPN_ID || null;
}

function ensurePesapalIpnId() {
  const ipnId = getPesapalIpnId();
  if (!ipnId) {
    throw new Error('Missing Pesapal IPN ID: set PESAPAL_IPN_ID with your registered Pesapal ipn_id');
  }
  return ipnId;
}

function validateConfig() {
  const key = getConsumerKey();
  const secret = getConsumerSecret();
  const missing = [];
  if (!key) missing.push('PESAPAL_CONSUMER_KEY / PESAPAL_KEY / PESAPAL_API_KEY');
  if (!secret) missing.push('PESAPAL_CONSUMER_SECRET / PESAPAL_SECRET / PESAPAL_API_SECRET');

  if (missing.length) throw new Error(`Missing Pesapal configuration: ${missing.join(', ')}`);
  return { key, secret };
}

function getPesapalCallbackUrl(req) {
  if (process.env.PESAPAL_CALLBACK_URL) {
    return process.env.PESAPAL_CALLBACK_URL;
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/api/payments/pesapal/webhook`;
}

function getPesapalApiBaseUrls() {
  const env = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
  if (env === 'production') {
    return ['https://pay.pesapal.com/v3'];
  }
  return ['https://cybjqa.pesapal.com/pesapalv3'];
}

function buildPesapalApiUrls(path) {
  return getPesapalApiBaseUrls().flatMap((base) => {
    const url = `${base}/api${path}`;
    return path.includes('?') ? [url] : [url, `${url}/`];
  });
}

async function parsePesapalErrorResponse(response) {
  const text = await response.text();
  try {
    return { statusText: response.statusText || `HTTP ${response.status}`, body: JSON.parse(text) };
  } catch {
    return { statusText: response.statusText || `HTTP ${response.status}`, body: text };
  }
}

async function registerPesapalIpn(req, res) {
  try {
    validateConfig();
    const targetUrl = req.body?.url || getPesapalCallbackUrl(req);
    if (!targetUrl) {
      return res.status(400).json({ ok: false, error: 'callback_url_required' });
    }

    const token = await getPesapalToken();
    const registerUrls = buildPesapalApiUrls('/URLSetup/RegisterIPN');
    let lastError = null;

    for (const registerUrl of registerUrls) {
      try {
        console.log(`[Pesapal] Registering IPN URL at ${registerUrl} -> ${targetUrl}`);
        const response = await fetch(registerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            url: targetUrl,
            ipn_notification_type: 'POST',
          }),
        });

        if (!response.ok) {
          const { statusText, body } = await parsePesapalErrorResponse(response);
          console.error(`[Pesapal] IPN registration failed for ${registerUrl}: ${statusText}`, body);
          lastError = new Error(`Pesapal IPN registration failed: ${statusText} - ${JSON.stringify(body).substring(0, 200)}`);
          continue;
        }

        const data = await response.json();
        const ipnId = data.ipn_id || data.ipnId || data.notification_id;
        if (!ipnId) {
          console.error('[Pesapal] IPN registration returned no ipn_id', data);
          throw new Error('Pesapal IPN registration did not return an ipn_id');
        }

        console.log('[Pesapal] IPN registered successfully', data);
        return res.json({ ok: true, ipnId, data });
      } catch (err) {
        lastError = err;
        console.error(`[Pesapal] registerPesapalIpn attempt error for ${registerUrl}:`, err.message);
      }
    }

    throw lastError;
  } catch (err) {
    console.error('[Pesapal] registerPesapalIpn error:', err.message);
    return res.status(500).json({ ok: false, error: err.message || 'IPN_REGISTRATION_FAILED' });
  }
}

// Get OAuth2 token from Pesapal v3 API
async function getPesapalToken() {
  const { key, secret } = validateConfig();
  const env = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
  const tokenUrls = buildPesapalApiUrls('/Auth/RequestToken');

  try {
    console.log(`[Pesapal] Requesting token from ${env} environment`);
    let lastError = null;
    for (const tokenUrl of tokenUrls) {
      try {
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            consumer_key: key,
            consumer_secret: secret,
          }),
        });

        if (!response.ok) {
          const { statusText, body } = await parsePesapalErrorResponse(response);
          console.error(`[Pesapal] Token request failed for ${tokenUrl}: ${statusText}`, body);
          lastError = new Error(`Pesapal token request failed: ${statusText} - ${JSON.stringify(body).substring(0, 200)}`);
          continue;
        }

        const data = await response.json();
        if (!data.token) {
          console.error('[Pesapal] No token in response', data);
          lastError = new Error('Pesapal API returned no token');
          continue;
        }

        console.log(`[Pesapal] Successfully obtained access token from ${tokenUrl}`);
        return data.token;
      } catch (err) {
        lastError = err;
        console.error(`[Pesapal] Token request error for ${tokenUrl}:`, err.message);
      }
    }
    throw lastError;
  } catch (err) {
    console.error('[Pesapal] getPesapalToken error:', err.message);
    throw err;
  }
}

// Submit order to Pesapal v3 API
async function submitPesapalOrder({
  amount,
  reference,
  email,
  firstName,
  lastName,
  callbackUrl,
}) {
  const token = await getPesapalToken();
  const ipnId = ensurePesapalIpnId();
  const orderUrls = buildPesapalApiUrls('/Transactions/SubmitOrderRequest');

  try {
    let lastError = null;
    for (const orderUrl of orderUrls) {
      try {
        console.log(`[Pesapal] Submitting order ${reference} for amount ${amount} KES to ${orderUrl}`);
        const response = await fetch(orderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: reference,
            currency: 'KES',
            amount,
            description: 'Payment for account creation',
            callback_url: callbackUrl,
            notification_id: ipnId,
            billing_address: {
              email_address: email || 'customer@pesapal.com',
              phone_number: '',
              country_code: 'KE',
              first_name: firstName || 'Customer',
              last_name: lastName || '',
            },
          }),
        });

        if (!response.ok) {
          const { statusText, body } = await parsePesapalErrorResponse(response);
          console.error(`[Pesapal] Order submission failed for ${orderUrl}: ${statusText}`, body);
          lastError = new Error(`Pesapal order submission failed: ${statusText} - ${JSON.stringify(body).substring(0, 200)}`);
          continue;
        }

        const data = await response.json();
        const orderTrackingId = data.order_tracking_id || data.orderId || data.order_id || data.id || data.transaction_id || data.tracking_id;
        const redirectUrl = data.redirect_url || data.checkout_url || data.redirectUrl || data.checkoutUrl;

        if (!orderTrackingId && !redirectUrl) {
          console.error('[Pesapal] Unexpected order response', data);
          throw new Error('Pesapal did not return a valid order identifier or redirect URL');
        }

        console.log(`[Pesapal] Order ${reference} submitted successfully. Order ID: ${orderTrackingId}`);
        return {
          orderTrackingId,
          redirectUrl,
        };
      } catch (err) {
        lastError = err;
        console.error(`[Pesapal] submitPesapalOrder attempt error for ${orderUrl}:`, err.message);
      }
    }
    throw lastError;
  } catch (err) {
    console.error('[Pesapal] submitPesapalOrder error:', err.message);
    throw err;
  }
}

// Query Pesapal for payment status
async function getPesapalPaymentStatus(orderTrackingId) {
  const token = await getPesapalToken();
  const statusUrls = buildPesapalApiUrls(`/Transactions/GetTransactionStatus?order_tracking_id=${orderTrackingId}`);

  try {
    let lastError = null;
    for (const statusUrl of statusUrls) {
      try {
        console.log(`[Pesapal] Querying status for order ${orderTrackingId} on ${statusUrl}`);
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const { statusText, body } = await parsePesapalErrorResponse(response);
          console.error(`[Pesapal] Status query failed for ${statusUrl}: ${statusText}`, body);
          lastError = new Error(`Pesapal status query failed: ${statusText}`);
          continue;
        }

        const data = await response.json();
        console.log(`[Pesapal] Status for ${orderTrackingId}: ${data.payment_status_description}`);
        return {
          orderTrackingId: data.order_tracking_id,
          status: data.payment_status_description,
          paymentMethod: data.payment_method,
          amount: data.amount,
        };
      } catch (err) {
        lastError = err;
        console.error(`[Pesapal] getPesapalPaymentStatus attempt error for ${statusUrl}:`, err.message);
      }
    }
    throw lastError;
  } catch (err) {
    console.error('[Pesapal] getPesapalPaymentStatus error:', err.message);
    throw err;
  }
}

// No longer using old OAuth 1.0 methods - using v3 API with JWT tokens instead

// Verify Pesapal webhook signature (v3 uses Bearer token in Authorization header)
function verifyWebhookSignature(body, signature, secret) {
  if (!signature || !secret) {
    console.warn('[Pesapal] Webhook verification skipped: missing signature or secret');
    return false; // In sandbox, allow unsigned webhooks
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('base64');

  const isValid = hash === signature;
  if (!isValid) {
    console.error('[Pesapal] Webhook signature mismatch');
  }
  return isValid;
}

async function initPesapal(req, res) {
  try {
    validateConfig();

    const { uid, email } = req.user || {};
    if (!uid) {
      console.warn('[Pesapal] Init request without authenticated user');
      return res.status(403).json({ ok: false, error: 'AUTH_REQUIRED' });
    }

    console.log(`[Pesapal] Initializing payment for user ${uid}`);
    const rdb = firebaseAdmin.database();
    const pendingRef = rdb.ref('pendingPayments').push();
    const pendingId = pendingRef.key;

    // Submit order to Pesapal
    const callbackUrl = getPesapalCallbackUrl(req);
    console.log(`[Pesapal] Callback URL for order: ${callbackUrl}`);
    const orderData = await submitPesapalOrder({
      amount: PAID_AMOUNT,
      reference: pendingId,
      email,
      firstName: 'Customer',
      lastName: '',
      callbackUrl,
    });

    await pendingRef.set({
      uid,
      email: email || null,
      amount: PAID_AMOUNT,
      provider: 'pesapal',
      status: 'PENDING',
      type: 'USER',
      orderTrackingId: orderData.orderTrackingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await rdb.ref(`pendingUsers/${pendingId}`).set({
      email: email || null,
      phoneNumber: null,
      name: null,
      status: 'PENDING',
      provider: 'pesapal',
      orderTrackingId: orderData.orderTrackingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`[Pesapal] Payment initialized successfully for user ${uid}. Pending ID: ${pendingId}`);
    return res.json({ ok: true, pendingId, iframeUrl: orderData.redirectUrl });
  } catch (err) {
    console.error('[Pesapal] initPesapal error:', err.message);
    return res.status(500).json({ ok: false, error: err.message || 'PESAPAL_INIT_FAILED' });
  }
}

async function initPesapalGuest(req, res) {
  try {
    validateConfig();

    const { email, password, name, country, idNumber, phoneNumber, referralCode } = req.body;

    if (!email || !password) {
      console.warn('[Pesapal] Guest init request without email or password');
      return res.status(400).json({ ok: false, error: 'email_and_password_required' });
    }

    console.log(`[Pesapal] Initializing guest payment for email ${email}`);
    const rdb = firebaseAdmin.database();
    const pendingRef = rdb.ref('pendingPayments').push();
    const pendingId = pendingRef.key;

    // Submit order to Pesapal
    const nameParts = (name || 'Customer').split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';

    const callbackUrl = getPesapalCallbackUrl(req);
    console.log(`[Pesapal] Callback URL for order: ${callbackUrl}`);
    const orderData = await submitPesapalOrder({
      amount: PAID_AMOUNT,
      reference: pendingId,
      email,
      firstName,
      lastName,
      callbackUrl,
    });

    await pendingRef.set({
      email,
      password,
      phoneNumber: phoneNumber || null,
      name: name || null,
      country: country || null,
      idNumber: idNumber || null,
      referralCode: referralCode || null,
      amount: PAID_AMOUNT,
      provider: 'pesapal',
      status: 'PENDING',
      type: 'GUEST',
      orderTrackingId: orderData.orderTrackingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await rdb.ref(`pendingUsers/${pendingId}`).set({
      email,
      password,
      phoneNumber: phoneNumber || null,
      name: name || null,
      country: country || null,
      idNumber: idNumber || null,
      referralCode: referralCode || null,
      status: 'PENDING',
      provider: 'pesapal',
      orderTrackingId: orderData.orderTrackingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`[Pesapal] Guest payment initialized successfully. Pending ID: ${pendingId}`);
    return res.json({ ok: true, pendingId, iframeUrl: orderData.redirectUrl });
  } catch (err) {
    console.error('Pesapal Init Error:', err);
    console.error('[Pesapal] initPesapalGuest error:', err.message);
    return res.status(500).json({ ok: false, error: err.message || 'PESAPAL_INIT_FAILED' });
  }
}

// Helper function for processing payments (used by both M-Pesa and Pesapal webhooks)
async function processPendingPaymentHelper({ pendingKey, data, status }) {
  const rdb = firebaseAdmin.database();
  const referralService = (await import('../services/referralService.js')).default;
  const docRef = rdb.ref(`pendingPayments/${pendingKey}`);
  const pendingUserRef = rdb.ref(`pendingUsers/${pendingKey}`);
  const now = new Date().toISOString();

  if (status === 'SUCCESS') {
    await docRef.update({ status: 'COMPLETED', updatedAt: now });
    await pendingUserRef.update({
      paymentStatus: 'COMPLETED',
      paymentCompletedAt: now,
      updatedAt: now,
    });

    // For PayPal-based approvals, actual user activation must happen on admin approval.
    return;
  }

  if (status === 'FAILED') {
    await docRef.update({ status: 'FAILED', updatedAt: now });
    await pendingUserRef.update({ status: 'FAILED', updatedAt: now });
    return;
  }

  if (status === 'PENDING') {
    await docRef.update({ status: 'PENDING', updatedAt: now });
    await pendingUserRef.update({ status: 'PENDING', updatedAt: now });
    return;
  }

  await docRef.update({ status: 'FAILED', updatedAt: now });
  await pendingUserRef.update({ status: 'FAILED', updatedAt: now });
}

// In production this would handle Pesapal's callback. For now we accept a payload
// and mark the corresponding pending payment as completed or failed.
async function webhook(req, res) {
  try {
    const signature = req.headers['x-pesapal-signature'];

    // Accept multiple possible identifier fields from Pesapal payloads
    const body = req.body || {};
    let pendingId = body.pendingId || body.pending_id || body.reference || body.merchant_reference || body.order_tracking_id || body.orderTrackingId || body.orderId || body.id || body.transaction_id || null;

    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyWebhookSignature(body, signature, process.env.PESAPAL_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('[Pesapal] Webhook failed signature verification');
        return res.status(401).json({ ok: false, error: 'INVALID_SIGNATURE' });
      }
    }

    const rdb = firebaseAdmin.database();
    let pendingSnap = null;

    if (pendingId) {
      pendingSnap = await rdb.ref(`pendingPayments/${pendingId}`).get();
    }

    // If no pendingId provided or not found, try to lookup by orderTrackingId stored on pendingPayments
    if ((!pendingSnap || !pendingSnap.exists()) && (body.order_tracking_id || body.orderTrackingId || body.orderId || body.id)) {
      const orderTrackingId = body.order_tracking_id || body.orderTrackingId || body.orderId || body.id;
      console.log(`[Pesapal] Trying to resolve pending payment by orderTrackingId=${orderTrackingId}`);
      const snaps = await rdb.ref('pendingPayments').orderByChild('orderTrackingId').equalTo(orderTrackingId).limitToFirst(1).get();
      if (snaps.exists()) {
        const val = snaps.val();
        const keys = Object.keys(val);
        pendingId = keys[0];
        pendingSnap = await rdb.ref(`pendingPayments/${pendingId}`).get();
      }
    }

    if (!pendingSnap || !pendingSnap.exists()) {
      console.warn(`[Pesapal] Webhook received for non-existent pending payment (tried pendingId=${pendingId})`);
      return res.status(404).json({ ok: false, error: 'PENDING_NOT_FOUND' });
    }

    // Determine status from Pesapal payload fields
    let incomingStatus = body.status || body.payment_status_description || body.payment_status || body.payment_status_description?.toUpperCase();
    if (typeof incomingStatus === 'string') incomingStatus = incomingStatus.toUpperCase();

    // Map Pesapal statuses to internal statuses expected by processPendingPaymentHelper
    let finalStatus = 'FAILED';
    if (!incomingStatus) {
      // Fallback to success if webhook explicitly indicates success via a 'success' boolean
      if (body.success === true || body.success === 'true') finalStatus = 'SUCCESS';
    } else if (incomingStatus.includes('COMPLETED') || incomingStatus.includes('SUCCESS')) {
      finalStatus = 'SUCCESS';
    } else if (incomingStatus.includes('PENDING')) {
      finalStatus = 'PENDING';
    } else {
      finalStatus = 'FAILED';
    }

    console.log(`[Pesapal] Webhook processing pendingId=${pendingId} mappedStatus=${finalStatus} incomingStatus=${incomingStatus}`);

    await processPendingPaymentHelper({ pendingKey: pendingId, data: pendingSnap.val(), status: finalStatus });

    return res.json({ ok: true, pendingId, status: finalStatus });
  } catch (err) {
    console.error('[Pesapal] Webhook error:', err.message);
    return res.status(500).json({ ok: false, error: 'WEBHOOK_FAILED' });
  }
}

async function simulateWebhook(req, res) {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'SIMULATION_DISABLED' });
    const { pendingId, status = 'SUCCESS' } = req.body;
    if (!pendingId) return res.status(400).json({ ok: false, error: 'pendingId_required' });

    const rdb = firebaseAdmin.database();
    const pendingSnap = await rdb.ref(`pendingPayments/${pendingId}`).get();
    if (!pendingSnap.exists()) return res.status(404).json({ ok: false, error: 'PENDING_NOT_FOUND' });

    const finalStatus = status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
    console.log(`[Pesapal] Simulating webhook for ${pendingId} with status ${finalStatus}`);
    
    await processPendingPaymentHelper({ pendingKey: pendingId, data: pendingSnap.val(), status: finalStatus });
    
    return res.json({ ok: true });
  } catch (err) {
    console.error('simulatePesapalWebhook error', err);
    return res.status(500).json({ ok: false, error: 'SIMULATION_FAILED' });
  }
}

// New endpoint to check payment status
async function checkPaymentStatus(req, res) {
  try {
    const { pendingId } = req.params;
    if (!pendingId) {
      console.warn('[Pesapal] Status check without pendingId');
      return res.status(400).json({ ok: false, error: 'pendingId_required' });
    }

    const rdb = firebaseAdmin.database();
    const pendingSnap = await rdb.ref(`pendingPayments/${pendingId}`).get();
    if (!pendingSnap.exists()) {
      console.warn(`[Pesapal] Status check for non-existent pendingId: ${pendingId}`);
      return res.status(404).json({ ok: false, error: 'PENDING_NOT_FOUND' });
    }

    const pending = pendingSnap.val();

    // If no orderTrackingId (shouldn't happen with new integration), return current status
    if (!pending.orderTrackingId) {
      console.log(`[Pesapal] Returning cached status for ${pendingId}: ${pending.status}`);
      return res.json({ ok: true, pendingId, status: pending.status });
    }

    console.log(`[Pesapal] checkPaymentStatus for pendingId=${pendingId} orderTrackingId=${pending.orderTrackingId}`);

    // Query Pesapal for actual payment status
    let pesapalStatus;
    try {
      pesapalStatus = await getPesapalPaymentStatus(pending.orderTrackingId);
    } catch (err) {
      console.warn(`[Pesapal] Failed to query Pesapal for ${pendingId}, returning cached status: ${pending.status}`);
      return res.json({ ok: true, pendingId, status: pending.status, warning: 'Status from cache (API unavailable)' });
    }

    // Normalize Pesapal status
    const rawStatus = String(pesapalStatus.status || '').toUpperCase();
    let mappedStatus = pending.status;
    if (rawStatus.includes('COMPLETED') || rawStatus.includes('PAID') || rawStatus.includes('SUCCESS')) {
      mappedStatus = 'COMPLETED';
    } else if (rawStatus.includes('FAILED') || rawStatus.includes('DECLINED') || rawStatus.includes('ERROR')) {
      mappedStatus = 'FAILED';
    } else if (rawStatus.includes('PENDING') || rawStatus.includes('AWAITING') || rawStatus.includes('PROCESSING')) {
      mappedStatus = 'PENDING';
    }

    // Update our database with the actual status if changed
    if (mappedStatus !== pending.status) {
      console.log(`[Pesapal] Updating ${pendingId} status from ${pending.status} to ${mappedStatus}`);
      await rdb.ref(`pendingPayments/${pendingId}`).update({
        status: mappedStatus,
        updatedAt: new Date().toISOString(),
      });
      await rdb.ref(`pendingUsers/${pendingId}`).update({
        status: mappedStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.json({ ok: true, pendingId, status: mappedStatus, pesapalData: pesapalStatus });
  } catch (err) {
    console.error('[Pesapal] checkPaymentStatus error:', err.message);
    return res.status(500).json({ ok: false, error: err.message || 'STATUS_CHECK_FAILED' });
  }
}

function webhookHealth(req, res) {
  return res.json({ ok: true, message: 'Pesapal webhook endpoint is available' });
}

export default { initPesapal, initPesapalGuest, registerPesapalIpn, checkPaymentStatus, webhook, webhookHealth, simulateWebhook, getPesapalPaymentStatus };
