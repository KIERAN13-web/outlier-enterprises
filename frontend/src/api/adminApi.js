import client from './client';

const login = (adminKey) =>
  client.request('/admin/login', {
    method: 'POST',
    body: { adminKey },
  });

const searchUsers = (adminToken, query) =>
  client.request(`/admin/users/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: { 'X-Admin-Token': adminToken },
  });

const getUserDetails = (adminToken, uid) =>
  client.request(`/admin/users/${uid}`, {
    method: 'GET',
    headers: { 'X-Admin-Token': adminToken },
  });

const updateWithdrawal = (adminToken, uid, withdrawalId, status) =>
  client.request('/admin/withdrawals/update', {
    method: 'POST',
    headers: { 'X-Admin-Token': adminToken },
    body: { uid, withdrawalId, status },
  });

const fundUser = (adminToken, uid, amount, reason) =>
  client.request('/admin/users/fund', {
    method: 'POST',
    headers: { 'X-Admin-Token': adminToken },
    body: { uid, amount, reason },
  });

const getPendingWithdrawals = (adminToken) =>
  client.request('/admin/withdrawals/pending', {
    method: 'GET',
    headers: { 'X-Admin-Token': adminToken },
  });

const getDashboardStats = (adminToken) =>
  client.request('/admin/stats', {
    method: 'GET',
    headers: { 'X-Admin-Token': adminToken },
  });

export default {
  login,
  searchUsers,
  getUserDetails,
  updateWithdrawal,
  fundUser,
  getPendingWithdrawals,
  getDashboardStats,
};
