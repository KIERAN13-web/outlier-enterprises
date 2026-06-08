import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../firebase/client';
import authApi from '../api/authApi';
import paymentApi from '../api/paymentApi';
import './Auth.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [step, setStep] = useState(1); // 1=email+password, 2=phone+payment
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [simulationBusy, setSimulationBusy] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');
  const isDevMode = import.meta.env.MODE !== 'production';

  const navigate = useNavigate();

  async function onCreateAccount(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setShowLoginLink(false);
    // Defer actual Firebase account creation until after payment completes.
    // Validate inputs, then move to payment card where we'll initiate payment.
    if (!email || !password) {
      setError('Email and password are required');
      setBusy(false);
      return;
    }

    setStep(2);
    setBusy(false);
  }

  async function onPay(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSimulationMessage('');
    try {
      // Initiate guest STK push that includes email + password so the backend
      // can create the user after successful payment via webhook.
      const result = await paymentApi.createStkPushGuest({ email, password, phoneNumber });

      setSuccess(true);
      setPendingId(result.pendingId);
      if (!isDevMode) {
        setTimeout(() => navigate(`/payment-status/${result.pendingId}`, { replace: true }), 500);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSimulatePayment() {
    if (!pendingId) return;
    setSimulationBusy(true);
    setError('');
    setSimulationMessage('');

    try {
      await paymentApi.simulateWebhook(pendingId, 'SUCCESS');
      setSimulationMessage('Payment simulated successfully. Account should now be created. Redirecting to login...');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      console.error(err);
      setError('Unable to simulate payment. Please try again.');
    } finally {
      setSimulationBusy(false);
    }
  }



  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>{step === 1 ? 'Start with your email and password' : 'Enter your mobile number to make payment'}</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
            {showLoginLink && (
              <p>
                Already have an account? <Link to="/login" className="toggle-auth">Login</Link>
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={onCreateAccount} className="auth-form">
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
              {busy ? 'Creating account...' : 'Continue to payment'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onPay} className="auth-form">
            {success && <div className="success-message">✓ Payment request sent! Redirecting...</div>}

            <div className="form-group">
              <label htmlFor="phone">M-Pesa Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="07XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={success}
                required
              />
              <small>Enter your M-Pesa registered phone number</small>
            </div>

            <button disabled={busy || success} type="submit" className="btn btn-primary btn-full">
              {busy ? 'Processing...' : 'Pay KES 200'}
            </button>

            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="toggle-auth">Login</Link>
              </p>
            </div>
          </form>
        )}

        <div className="auth-links">
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

