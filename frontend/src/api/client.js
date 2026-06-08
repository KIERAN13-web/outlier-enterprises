const apiUrl = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = apiUrl ? `${apiUrl.replace(/\/+$|\/$/, '')}/api` : null;
const isBackendConfigured = Boolean(
  API_BASE_URL &&
  !apiUrl.includes('your-backend-url') &&
  !apiUrl.includes('your-backend.railway.app') &&
  !apiUrl.includes('your-frontend.vercel.app')
);

async function request(path, { method = 'GET', body, token, headers: customHeaders = {} } = {}) {
  if (!API_BASE_URL) {
    throw new Error('Backend API is not configured. Set VITE_API_URL to your deployed backend URL.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export { isBackendConfigured };
export default { request };
