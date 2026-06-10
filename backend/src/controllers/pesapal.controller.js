import crypto from 'crypto';
import firebaseAdmin from '../services/firebaseAdmin.js';

const PAID_AMOUNT = Number(process.env.PAID_AMOUNT || 200);

// Read from env at runtime (not at module load) so Railway env vars are picked up even if process is already running
function getConsumerKey() {
  return process.env.PESAPAL_CONSUMER_KEY || process.env.PESAPAL_KEY || process.env.PESAPAL_API_KEY;
}

function getConsumerSecret() {
  return process.env.PESAPAL_CONSUMER_SECRET || process.env.PESAPAL_SECRET || process.env.PESAPAL_API_SECRET;
}

function validateConfig() {
  const key = getConsumerKey();
  const secret = getConsumerSecret();
  const missing = [];
  if (!key) missing.push('PESAPAL_CONSUMER_KEY / PESAPAL_KEY / PESAPAL_API_KEY');
  if (!secret) missing.push('PESAPAL_CONSUMER_SECRET / PESAPAL_SECRET / PESAPAL_API_SECRET');
  // If running in production, ensure callback URL is provided so Pesapal can POST webhooks
  const env = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
  if (env === 'production' && !process.env.PESAPAL_CALLBACK_URL) {
    missing.push('PESAPAL_CALLBACK_URL');
  }

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
    return [
      'https://pay.pesapal.com/v3',
      'https://pay.pesapal.com/pesapalv3/api',
    ];
  }
  return [
    'https://cybqa.pesapal.com/pesapalv3',
    'https://cybqa.pesapal.com/pesapalv3/api',
  ];
}

function buildPesapalApiUrls(path) {
  return getPesapalApiBaseUrls().flatMap((base) => {
    const url = `${base}${path}`;
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
  const orderUrls = buildPesapalApiUrls('/Transactions/InitiateTransaction');

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
            reference,
            amount,
            description: 'Payment for account creation',
            currency: 'KES',
            buyer_email: email || 'customer@pesapal.com',
            buyer_first_name: firstName || 'Customer',
            buyer_last_name: lastName || '',
            buyer_phone: '',
            redirect_mode: 'IFRAME',
            callback_url: callbackUrl,
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
        if (!data.order_tracking_id) {
          console.error('[Pesapal] No order_tracking_id in response', data);
          throw new Error('Pesapal did not return an order tracking ID');
        }
        console.log(`[Pesapal] Order ${reference} submitted successfully. Tracking ID: ${data.order_tracking_id}`);
        return {
          orderTrackingId: data.order_tracking_id,
          redirectUrl: data.redirect_url,
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
      phoneNumber: phoneNumber || null,
      name: name || null,
      country: country || null,
      idNumber: idNumber || null,
      status: 'PENDING',
      provider: 'pesapal',
      orderTrackingId: orderData.orderTrackingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`[Pesapal] Guest payment initialized successfully. Pending ID: ${pendingId}`);
    return res.json({ ok: true, pendingId, iframeUrl: orderData.redirectUrl });
  } catch (err) {
    console.error('[Pesapal] initPesapalGuest error:', err.message);
    return res.status(500).json({ ok: false, error: err.message || 'PESAPAL_INIT_FAILED' });
  }
}

// In production this would handle Pesapal's callback. For now we accept a payload
// and mark the corresponding pending payment as completed or failed.
async function webhook(req, res) {
  try {
    const { pendingId, status = 'SUCCESS' } = req.body;
    const signature = req.headers['x-pesapal-signature'];

    if (!pendingId) {
      console.warn('[Pesapal] Webhook received without pendingId');
      return res.status(400).json({ ok: false, error: 'pendingId_required' });
    }

    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyWebhookSignature(req.body, signature, process.env.PESAPAL_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('[Pesapal] Webhook failed signature verification');
        return res.status(401).json({ ok: false, error: 'INVALID_SIGNATURE' });
      }
    }

    const rdb = firebaseAdmin.database();
    const pendingSnap = await rdb.ref(`pendingPayments/${pendingId}`).get();
    if (!pendingSnap.exists()) {
      console.warn(`[Pesapal] Webhook received for non-existent pendingId: ${pendingId}`);
      return res.status(404).json({ ok: false, error: 'PENDING_NOT_FOUND' });
    }

    const finalStatus = status === 'SUCCESS' ? 'COMPLETED' : 'FAILED';
    console.log(`[Pesapal] Webhook marking ${pendingId} as ${finalStatus}`);

    await rdb.ref(`pendingPayments/${pendingId}`).update({
      status: finalStatus,
      updatedAt: new Date().toISOString(),
    });
    await rdb.ref(`pendingUsers/${pendingId}`).update({
      status: finalStatus,
      updatedAt: new Date().toISOString(),
    });

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

    await rdb.ref(`pendingPayments/${pendingId}`).update({ status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED', updatedAt: new Date().toISOString() });
    await rdb.ref(`pendingUsers/${pendingId}`).update({ status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED', updatedAt: new Date().toISOString() });

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

    // Query Pesapal for actual payment status
    let pesapalStatus;
    try {
      pesapalStatus = await getPesapalPaymentStatus(pending.orderTrackingId);
    } catch (err) {
      console.warn(`[Pesapal] Failed to query Pesapal for ${pendingId}, returning cached status: ${pending.status}`);
      return res.json({ ok: true, pendingId, status: pending.status, warning: 'Status from cache (API unavailable)' });
    }

    // Map Pesapal status to our status
    let mappedStatus = pending.status;
    if (pesapalStatus.status === 'COMPLETED') {
      mappedStatus = 'COMPLETED';
    } else if (pesapalStatus.status === 'FAILED') {
      mappedStatus = 'FAILED';
    } else if (pesapalStatus.status === 'PENDING') {
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

export default { initPesapal, initPesapalGuest, checkPaymentStatus, webhook, webhookHealth, simulateWebhook };
