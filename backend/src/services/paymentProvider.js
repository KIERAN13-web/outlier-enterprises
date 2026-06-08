const env = {
  environment: process.env.M_PESA_ENV || process.env.MPESA_ENV || 'sandbox',
  consumerKey: process.env.M_PESA_CONSUMER_KEY || process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.M_PESA_CONSUMER_SECRET || process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.M_PESA_SHORT_CODE || process.env.MPESA_SHORTCODE || process.env.MPESA_BUSINESS_SHORTCODE,
  passkey: process.env.M_PESA_PASSKEY || process.env.MPESA_PASSKEY,
  callbackUrl: process.env.M_PESA_CALLBACK_URL || process.env.MPESA_CALLBACK_URL,
};

function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  const digits = phoneNumber.replace(/[^0-9]/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('07') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  return digits;
}

function validateConfig() {
  const missing = [];
  if (!env.consumerKey) missing.push('M_PESA_CONSUMER_KEY / MPESA_CONSUMER_KEY');
  if (!env.consumerSecret) missing.push('M_PESA_CONSUMER_SECRET / MPESA_CONSUMER_SECRET');
  if (!env.shortcode) missing.push('M_PESA_SHORT_CODE / MPESA_SHORTCODE / MPESA_BUSINESS_SHORTCODE');
  if (!env.passkey) missing.push('M_PESA_PASSKEY / MPESA_PASSKEY');
  if (!env.callbackUrl) missing.push('M_PESA_CALLBACK_URL / MPESA_CALLBACK_URL');
  if (missing.length) {
    throw new Error(`Missing M-Pesa configuration: ${missing.join(', ')}`);
  }
}

function getBaseUrl() {
  return env.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function getTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function getPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

async function getAccessToken() {
  const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;
  const basicToken = Buffer.from(`${env.consumerKey}:${env.consumerSecret}`).toString('base64');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${basicToken}`,
      Accept: 'application/json',
    },
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`M-Pesa auth failed: ${response.status} ${body.errorMessage || body.error || JSON.stringify(body)}`);
  }

  return body.access_token;
}

async function createStkPush({ uid, email, phoneNumber, amount }) {
  validateConfig();

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) {
    throw new Error('Invalid M-Pesa phone number. Use 07XXXXXXXX or 2547XXXXXXXX.');
  }

  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(env.shortcode, env.passkey, timestamp);

  const payload = {
    BusinessShortCode: env.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Number(amount),
    PartyA: normalizedPhone,
    PartyB: env.shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: env.callbackUrl,
    AccountReference: uid || email || normalizedPhone,
    TransactionDesc: `Payment request for ${email || uid || normalizedPhone}`,
  };

  const response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.ResponseCode !== '0') {
    throw new Error(`M-Pesa STK push failed: ${result.errorMessage || result.Message || JSON.stringify(result)}`);
  }

  return {
    provider: 'mpesa',
    uid,
    email: email || null,
    phoneNumber: normalizedPhone,
    amount,
    checkoutRequestId: result.CheckoutRequestID,
    merchantRequestId: result.MerchantRequestID,
    responseCode: result.ResponseCode,
    responseDescription: result.ResponseDescription,
    status: 'PENDING',
  };
}

export default {
  createStkPush,
};

