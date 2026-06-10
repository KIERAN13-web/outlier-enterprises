import crypto from 'crypto';
import firebaseAdmin from '../services/firebaseAdmin.js';

const PAID_AMOUNT = Number(process.env.PAID_AMOUNT || 200);
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

function validateConfig() {
  const missing = [];
  if (!PESAPAL_CONSUMER_KEY) missing.push('PESAPAL_CONSUMER_KEY');
  if (!PESAPAL_CONSUMER_SECRET) missing.push('PESAPAL_CONSUMER_SECRET');
  if (missing.length) throw new Error(`Missing Pesapal configuration: ${missing.join(', ')}`);
}

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(length = 16) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex');
}

function buildOauthSignature(method, url, params, consumerSecret) {
  const sorted = Object.keys(params).sort().map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(sorted)].join('&');
  const signingKey = `${percentEncode(consumerSecret)}&`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

async function initPesapal(req, res) {
  try {
    validateConfig();

    const { uid, email } = req.user || {};
    if (!uid) return res.status(403).json({ ok: false, error: 'AUTH_REQUIRED' });

    const rdb = firebaseAdmin.database();
    const pendingRef = rdb.ref('pendingPayments').push();
    const pendingId = pendingRef.key;

    await pendingRef.set({
      uid,
      email: email || null,
      amount: PAID_AMOUNT,
      provider: 'pesapal',
      status: 'PENDING',
      type: 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await rdb.ref(`pendingUsers/${pendingId}`).set({
      email: email || null,
      phoneNumber: null,
      name: null,
      status: 'PENDING',
      provider: 'pesapal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Build Pesapal request
    const env = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
    const base = env === 'production' ? 'https://www.pesapal.com' : 'https://sandbox.pesapal.com';
    const endpoint = `${base}/API/PostPesapalDirectOrderV4`;

    const callbackUrl = process.env.PESAPAL_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/payments/pesapal/webhook`;

    const nameParts = (email || 'customer').split('@')[0].split('.');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';

    const pesapalRequestData = `<PesapalDirectOrderInfo xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" Amount=\"${PAID_AMOUNT}\" Description=\"Payment for account\" Type=\"MERCHANT\" Reference=\"${pendingId}\" FirstName=\"${firstName}\" LastName=\"${lastName}\" Email=\"${email || ''}\" />`;

    const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
    const oauthNonce = generateNonce(8);

    const params = {
      oauth_consumer_key: PESAPAL_CONSUMER_KEY,
      oauth_nonce: oauthNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: oauthTimestamp,
      oauth_version: '1.0',
      oauth_callback: callbackUrl,
      pesapal_request_data: pesapalRequestData,
    };

    const oauthSignature = buildOauthSignature('GET', endpoint, params, PESAPAL_CONSUMER_SECRET);
    params.oauth_signature = oauthSignature;

    const qs = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    const iframeUrl = `${endpoint}?${qs}`;

    return res.json({ ok: true, pendingId, iframeUrl });
  } catch (err) {
    console.error('initPesapal error', err);
    return res.status(500).json({ ok: false, error: err.message || 'PESAPAL_INIT_FAILED' });
  }
}

// In production this would handle Pesapal's callback. For now we accept a payload
// and mark the corresponding pending payment as completed or failed.
async function webhook(req, res) {
  try {
    const { pendingId, status = 'SUCCESS' } = req.body;
    if (!pendingId) return res.status(400).json({ ok: false, error: 'pendingId_required' });

    const rdb = firebaseAdmin.database();
    const pendingSnap = await rdb.ref(`pendingPayments/${pendingId}`).get();
    if (!pendingSnap.exists()) return res.status(404).json({ ok: false, error: 'PENDING_NOT_FOUND' });

    await rdb.ref(`pendingPayments/${pendingId}`).update({ status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED', updatedAt: new Date().toISOString() });
    await rdb.ref(`pendingUsers/${pendingId}`).update({ status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED', updatedAt: new Date().toISOString() });

    return res.json({ ok: true });
  } catch (err) {
    console.error('pesapal webhook error', err);
    return res.status(500).json({ ok: false });
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

export default { initPesapal, webhook, simulateWebhook };
