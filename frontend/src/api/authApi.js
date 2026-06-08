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

export default { syncUser, getStatus };
