import client from './client';

const getWallet = (token) =>
  client.request('/wallet', {
    method: 'GET',
    token,
  });

const withdraw = (token, { amount, phoneNumber, earningType }) =>
  client.request('/wallet/withdraw', {
    method: 'POST',
    token,
    body: { amount, phoneNumber, earningType },
  });

const getWithdrawals = (token) =>
  client.request('/wallet/withdrawals', {
    method: 'GET',
    token,
  });

const markNotificationRead = (token, id) =>
  client.request(`/wallet/notifications/${id}/read`, {
    method: 'POST',
    token,
  });

export default { getWallet, withdraw, getWithdrawals, markNotificationRead };
