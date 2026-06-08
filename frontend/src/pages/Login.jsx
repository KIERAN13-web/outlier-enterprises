import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

import { auth } from '../firebase/client';
import { useNavigate, Link } from 'react-router-dom';
import authApi from '../api/authApi';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If Firebase env vars are missing/misconfigured, `auth` can be null.
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        const syncResult = await authApi.syncUser(token);
        const isAdmin = Boolean(syncResult?.isAdmin);
        if (isAdmin) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    });
    return () => unsub();
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();

    if (!auth) {
      setError('Firebase is not configured. Please set VITE_FIREBASE_* env vars and redeploy.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      let syncResult = null;
      try {
        syncResult = await authApi.syncUser(token);
      } catch (syncError) {
        console.warn('Backend sync failed, continuing with login:', syncError);
      }
      
      const isAdmin = Boolean(syncResult?.isAdmin);
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>

        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button disabled={busy} type="submit" className="btn btn-primary btn-full">
            {busy ? 'Signing in...' : 'Sign in'}

          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don\'t have an account?{' '}
            <Link to="/register" className="toggle-auth">Register</Link>
          </p>
        </div>


        <div className="auth-links">
          <Link to="/">Back to Home</Link>
          <Link to="/payment">View Pricing</Link>
        </div>
      </div>
    </div>
  );

}
