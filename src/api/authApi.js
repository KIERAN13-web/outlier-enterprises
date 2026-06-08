import client from './client';

const syncUser = (token) => client.request('/auth/sync', { method: 'POST', token });

const getStatus = (token) => client.request('/auth/status', { token });

export default { syncUser, getStatus };

