import client, { isBackendConfigured } from './client';

const syncUser = async (token) => {
  if (!isBackendConfigured) {
    return { isPaid: false };
  }
  return client.request('/auth/sync', { method: 'POST', token });
};

const getStatus = async (token) => {
  if (!isBackendConfigured) {
    return { isPaid: false };
  }
  return client.request('/auth/status', { token });
};

const changePassword = async (token, newPassword) => {
  if (!isBackendConfigured) {
    throw new Error('Backend not configured');
  }
  return client.request('/auth/change-password', { 
    method: 'POST', 
    token,
    body: { newPassword }
  });
};

export default { syncUser, getStatus, changePassword };

