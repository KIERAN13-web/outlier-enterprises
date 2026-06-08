import client from './client';

const createOutlierBook = (token, accountIds) =>
  client.request('/outliers/book', {
    method: 'POST',
    token,
    body: { accountIds },
  });

export default { createOutlierBook };

