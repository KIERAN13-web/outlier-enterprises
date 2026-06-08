import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../api/adminApi';
import './Auth.css';

export default function AdminLogin() {
  const [adminKey, setAdminKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function onLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const result = await adminApi.login(adminKey);
      if (result.ok) {
        // Store admin token in localStorage
        localStorage.setItem('adminToken', result.adminToken);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <h2>Admin Login</h2>
          <p>Access the admin dashboard</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={onLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="key">Admin Key</label>
            <input
              id="key"
              type="password"
              placeholder="Enter admin key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              required
            />
          </div>

          <button disabled={busy} type="submit" className="btn btn-primary btn-full">
            {busy ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
