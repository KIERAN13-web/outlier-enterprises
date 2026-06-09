import client from './client';

const createStkPush = (token, phoneNumber) =>
  client.request('/payments/mpesa/stk-push', {
    method: 'POST',
    token,
    body: { phoneNumber },
  });

const createStkPushGuest = ({ email, password, phoneNumber, name, country, idNumber, referralCode = null }) =>
  client.request('/payments/mpesa/stk-push/guest', {
    method: 'POST',
    body: { email, password, phoneNumber, name, country, idNumber, referralCode },
  });

const getPaymentStatus = (pendingId) =>
  client.request(`/payments/mpesa/status/${pendingId}`, {
    method: 'GET',
  });

const simulateWebhook = (pendingId, status = 'SUCCESS') =>
  client.request('/payments/mpesa/webhook/simulate', {
    method: 'POST',
    body: { pendingId, status },
  });

const bypassPayment = ({ email, password, phoneNumber, name, country, idNumber }) =>
  client.request('/payments/mpesa/bypass', {
    method: 'POST',
    body: { email, password, phoneNumber, name, country, idNumber },
  });

const placeOrder = (token, { accountId, accountName, amount }) =>
  client.request('/payments/orders', {
    method: 'POST',
    token,
    body: { accountId, accountName, amount },
  });

export default { createStkPush, createStkPushGuest, getPaymentStatus, simulateWebhook, bypassPayment, placeOrder };
