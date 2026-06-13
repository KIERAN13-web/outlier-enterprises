import { useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';

import { auth } from '../firebase/client';
import { useNavigate, Link } from 'react-router-dom';
import authApi from '../api/authApi';
import { getAndClearRedirectPage } from '../utils/pagePersistence';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();

    if (!auth) {
      setError('Firebase is not configured. Please set VITE_FIREBASE_* env vars and redeploy.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const statusResult = await authApi.getStatus(token);
      const isAdmin = Boolean(statusResult?.isAdmin);

      const redirectPage = getAndClearRedirectPage();
      const defaultDestination = isAdmin ? '/admin/dashboard' : '/dashboard';
      let destination = defaultDestination;

      if (redirectPage && !['/login', '/register', '/payment', '/'].includes(redirectPage)) {
        const isAdminRedirect = redirectPage.startsWith('/admin');
        if ((isAdmin && isAdminRedirect) || (!isAdmin && !isAdminRedirect)) {
          destination = redirectPage;
        }
      }

      navigate(destination, { replace: true });
    } catch (err) {
      console.error(err);
      const code = err?.code || err?.message || '';
      let message = 'Authentication failed';

      if (typeof code === 'string') {
        const normalized = code.toLowerCase();
        if (normalized.includes('wrong-password') || normalized.includes('wrong password')) {
          message = 'Wrong password';
        } else if (normalized.includes('user-not-found') || normalized.includes('user does not exist')) {
          message = 'User does not exist';
        } else if (normalized.includes('invalid-email') || normalized.includes('invalid email')) {
          message = 'Invalid email address';
        } else if (normalized.includes('too-many-requests')) {
          message = 'Too many login attempts. Please try again later.';
        } else if (normalized.includes('user-disabled') || normalized.includes('user disabled')) {
          message = 'This account has been disabled. Contact support.';
        } else if (normalized.includes('network-request-failed') || normalized.includes('network error')) {
          message = 'Network error. Please check your internet connection and try again.';
        } else if (err?.message) {
          message = err.message;
        }
      }

      setError(message);
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

