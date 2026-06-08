import client from './client';

const toggleAdminRole = (idToken, uid, makeAdmin) =>
  client.request('/admin/toggle-role', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: { uid, makeAdmin },
  });

const searchUsers = (idToken, query) =>
  client.request(`/admin/users/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });

const getUserDetails = (idToken, uid) =>
  client.request(`/admin/users/${uid}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });

const updateWithdrawal = (idToken, uid, withdrawalId, status) =>
  client.request('/admin/withdrawals/update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: { uid, withdrawalId, status },
  });

const fundUser = (idToken, uid, amount, reason) =>
  client.request('/admin/users/fund', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: { uid, amount, reason },
  });

const getPendingWithdrawals = (idToken) =>
  client.request('/admin/withdrawals/pending', {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });

const getDashboardStats = (idToken) =>
  client.request('/admin/stats', {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });

export default {
  toggleAdminRole,
  searchUsers,
  getUserDetails,
  updateWithdrawal,
  fundUser,
  getPendingWithdrawals,
  getDashboardStats,
};
