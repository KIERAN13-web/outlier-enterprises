// M-Pesa placeholder payment provider.
// Replace this with actual M-Pesa STK Push integration.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createStkPush({ uid, email, phoneNumber, amount }) {
  // TODO: Implement real M-Pesa STK push call.
  // You will need:
  // - OAuth access token from M-Pesa
  // - Password = base64encode(shortcode+passkey+timestamp)
  // - STK push payload
  // - store transaction metadata in Firestore for webhook correlation

  await sleep(300);

  return {
    provider: 'mpesa',
    uid,
    email: email || null,
    phoneNumber,
    amount,
    checkoutRequestId: `CHK_${Date.now()}`,
    status: 'INITIATED_PLACEHOLDER',
  };
}

export default {
  createStkPush,
};

