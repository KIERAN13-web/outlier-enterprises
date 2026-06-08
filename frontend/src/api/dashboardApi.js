import client from './client';

const getAccountPool = (token) => client.request('/dashboard/accounts', { token });

const getOrders = (token) => client.request('/payments/orders', { token });

export default { getAccountPool, getOrders };
