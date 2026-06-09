import client from './client';

const toggleAdminRole = (idToken, uid, makeAdmin) =>
  client.request('/admin/toggle-role', {
    method: 'POST',
    token: idToken,
    body: { uid, makeAdmin },
  });

const searchUsers = (idToken, query) =>
  client.request(`/admin/users/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    token: idToken,
  });

const getUserDetails = (idToken, uid) =>
  client.request(`/admin/users/${uid}`, {
    method: 'GET',
    token: idToken,
  });

const updateWithdrawal = (idToken, uid, withdrawalId, status) =>
  client.request('/admin/withdrawals/update', {
    method: 'POST',
    token: idToken,
    body: { uid, withdrawalId, status },
  });

const approveWithdrawal = (idToken, uid, withdrawalId) =>
  client.request(`/admin/withdrawals/${encodeURIComponent(uid)}/${encodeURIComponent(withdrawalId)}/approve`, {
    method: 'PUT',
    token: idToken,
  });

const markWithdrawalPaid = (idToken, uid, withdrawalId) =>
  client.request(`/admin/withdrawals/${encodeURIComponent(uid)}/${encodeURIComponent(withdrawalId)}/paid`, {
    method: 'PUT',
    token: idToken,
  });

const getAllWithdrawals = (idToken) =>
  client.request('/admin/withdrawals', {
    method: 'GET',
    token: idToken,
  });

const fundUser = (idToken, uid, amount, reason) =>
  client.request('/admin/users/fund', {
    method: 'POST',
    token: idToken,
    body: { uid, amount, reason },
  });

const getPendingWithdrawals = (idToken) =>
  client.request('/admin/withdrawals/pending', {
    method: 'GET',
    token: idToken,
  });

const getDashboardStats = (idToken) =>
  client.request('/admin/stats', {
    method: 'GET',
    token: idToken,
  });

export default {
  toggleAdminRole,
  searchUsers,
  getUserDetails,
  updateWithdrawal,
  approveWithdrawal,
  markWithdrawalPaid,
  getAllWithdrawals,
  fundUser,
  getPendingWithdrawals,
  getDashboardStats,
};
