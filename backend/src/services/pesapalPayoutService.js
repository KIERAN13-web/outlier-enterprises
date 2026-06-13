import crypto from 'crypto';

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
  if (!key) missing.push('PESAPAL_CONSUMER_KEY');
  if (!secret) missing.push('PESAPAL_CONSUMER_SECRET');
  if (missing.length) throw new Error(`Missing Pesapal configuration: ${missing.join(', ')}`);
  return { key, secret };
}

function getApiBaseUrls() {
  const env = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
  if (env === 'production') return ['https://pay.pesapal.com/v3'];
  return ['https://cybjqa.pesapal.com/pesapalv3'];
}

function buildApiUrls(path) {
  return getApiBaseUrls().flatMap((base) => {
    const url = `${base}/api${path}`;
    return path.includes('?') ? [url] : [url, `${url}/`];
  });
}

async function getToken() {
  const { key, secret } = validateConfig();
  const tokenUrls = buildApiUrls('/Auth/RequestToken');
  let lastErr = null;
  for (const url of tokenUrls) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
      });
      const data = await resp.json();
      if (resp.ok && data && data.token) return data.token;
      lastErr = new Error(`Token request failed: ${resp.status} ${JSON.stringify(data)}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  const trimmed = phoneNumber.toString().trim();
  if (trimmed.startsWith('+')) return trimmed.slice(1);
  if (trimmed.startsWith('0') && trimmed.length === 10) return `254${trimmed.slice(1)}`;
  return trimmed;
}

// Send a payout request to Pesapal (best-effort implementation — adapt to real API fields)
async function sendPayout({ amount, phoneNumber, reference, recipientName }) {
  validateConfig();
  const token = await getToken();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const payoutPaths = ['/Payouts/Initiate', '/Payouts/InitiatePayment'];
  let lastErr = null;

  const payload = {
    amount: Number(amount),
    currency: 'KES',
    description: `Withdrawal payout ${reference || Date.now()}`,
    reference: reference || `wd_${Date.now()}`,
    recipient_phone: normalizedPhone,
    recipient_msisdn: normalizedPhone,
    recipient_mobile: normalizedPhone,
    recipient_name: recipientName || null,
    recipient: {
      msisdn: normalizedPhone,
      name: recipientName || null,
    },
  };

  for (const path of payoutPaths) {
    const payoutUrls = buildApiUrls(path);
    for (const url of payoutUrls) {
      try {
        console.log(`[Pesapal] Initiating payout to ${normalizedPhone} via ${url}`);
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await resp.json().catch(() => null);
        if (!resp.ok) {
          lastErr = new Error(`Payout failed: ${resp.status} ${JSON.stringify(data)}`);
          console.error('[Pesapal] Payout error response:', data);
          continue;
        }

        console.log('[Pesapal] Payout request succeeded', data);
        return {
          ok: true,
          data,
          payoutId: data.payout_id || data.id || data.payoutId || data.payment_id || null,
        };
      } catch (err) {
        lastErr = err;
        console.error('[Pesapal] Payout request error:', err?.message || err);
      }
    }
  }

  throw lastErr;
}

export default { sendPayout };
