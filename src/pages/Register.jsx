import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../firebase/client';
import authApi from '../api/authApi';
import paymentApi from '../api/paymentApi';
import './Auth.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('mpesa');

  const [step, setStep] = useState(1); // 1=email+password, 2=phone+payment
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [simulationBusy, setSimulationBusy] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');
  const isDevMode = import.meta.env.MODE !== 'production';

  const navigate = useNavigate();
  // Read referral code from hash (HashRouter uses #/register?ref=...)
  let initialReferral = null;
  try {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const params = new URLSearchParams(hash.slice(qIndex + 1));
      initialReferral = params.get('ref');
    }
  } catch (e) {
    initialReferral = null;
  }

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
    setCheckoutUrl('');

    try {
      const result = provider === 'mpesa'
        ? await paymentApi.createStkPushGuest({ name, email, password, phoneNumber, referralCode: initialReferral })
        : await paymentApi.createPesapalGuest({ name, email, password, phoneNumber, country: null, idNumber: null, referralCode: initialReferral });

      if (provider === 'pesapal' && (!result.iframeUrl || !result.pendingId)) {
        throw new Error('Pesapal initialization failed. Please check backend configuration.');
      }

      setSuccess(true);
      setPendingId(result.pendingId);
      // Store provider for use in PaymentStatus page
      localStorage.setItem('paymentProvider', provider);
      if (provider === 'pesapal') {
        setCheckoutUrl(result.iframeUrl);
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
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
            {success && (
          <div className="success-message">
            ✓ Payment initialized successfully.
            {provider === 'pesapal' && checkoutUrl && (
              <div style={{ marginTop: '12px' }}>
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full">
                  Continue to Pesapal checkout
                </a>
                <p style={{ marginTop: '8px' }}>
                  After payment, return here and check your payment status on the <a href={`/payment-status/${pendingId}`}>status page</a>.
                </p>
              </div>
            )}
          </div>
        )}

            <div className="form-group">
              <label>Payment Method</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label>
                  <input type="radio" name="provider" value="mpesa" checked={provider === 'mpesa'} onChange={() => setProvider('mpesa')} /> M-Pesa
                </label>
                <label>
                  <input type="radio" name="provider" value="pesapal" checked={provider === 'pesapal'} onChange={() => setProvider('pesapal')} /> Pesapal
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="07XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={success}
                required={provider === 'mpesa'}
              />
              <small>{provider === 'mpesa' ? 'Enter your M-Pesa registered phone number' : 'Optional for Pesapal payment'}</small>
            </div>

            <button disabled={busy || success} type="submit" className="btn btn-primary btn-full">
              {busy ? (provider === 'mpesa' ? 'Processing...' : 'Initializing Pesapal...') : provider === 'mpesa' ? 'Pay KES 200' : 'Pay with Pesapal'}
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

