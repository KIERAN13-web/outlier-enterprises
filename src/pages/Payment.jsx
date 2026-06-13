import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/client';
import paymentApi from '../api/paymentApi';
import './Payment.css';

export default function Payment() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('mpesa');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const navigate = useNavigate();

  async function onPay(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      const token = await user.getIdToken();
      
      // Store provider in localStorage for PaymentStatus component
      localStorage.setItem('paymentProvider', provider);
      
      if (provider === 'mpesa') {
        await paymentApi.createStkPush(token, phoneNumber);
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        try {
          const resp = await paymentApi.createPesapalInit(token);
          if (resp && resp.pendingId) {
            setPendingId(resp.pendingId);
            setCheckoutUrl(resp.iframeUrl || '');
            localStorage.setItem('paymentProvider', provider);
            setSuccess(true);
          } else {
            setError('Failed to initialize Pesapal payment');
          }
        } catch (pesapalError) {
          console.error('Pesapal initialization error:', pesapalError);
          setError(pesapalError.message || 'Failed to initialize Pesapal payment');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h1>Simple, Transparent Pricing</h1>
        <p>Start analyzing your financial data with a one-time payment</p>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card card">
          <div className="pricing-header">
            <h3>Professional</h3>
            <div className="price">
              <span className="currency">KES</span>
              <span className="amount">200</span>
              <span className="period">/one-time</span>
            </div>
          </div>

          <ul className="features-list">
            <li>✓ Unlimited account analysis</li>
            <li>✓ Real-time outlier detection</li>
            <li>✓ Advanced reports</li>
            <li>✓ Data export</li>
            <li>✓ Priority support</li>
          </ul>

          <form onSubmit={onPay} className="payment-form">
            {error && <div className="error-message">{error}</div>}
            {success && provider === 'pesapal' && checkoutUrl && (
              <div className="success-message">
                ✓ Pesapal payment initialized successfully.
                <div style={{ marginTop: '12px' }}>
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full">
                    Continue to Pesapal checkout
                  </a>
                  {pendingId && (
                    <p style={{ marginTop: '8px' }}>
                      View status on the <a href={`/payment-status/${pendingId}`}>payment status page</a>.
                    </p>
                  )}
                </div>
              </div>
            )}
            {success && provider === 'mpesa' && (
              <div className="success-message">✓ Payment initiated successfully. Redirecting to dashboard...</div>
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

            {provider === 'mpesa' && (
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
            )}

            <button
              disabled={busy || success}
              type="submit"
              className="btn btn-primary btn-full"
            >
              {busy ? (provider === 'mpesa' ? 'Processing...' : 'Initializing Pesapal...') : success ? 'Payment Successful!' : provider === 'mpesa' ? 'Pay KES 200' : 'Pay with Pesapal'}
            </button>
          </form>

          <div className="payment-note">
            <p>🔒 Secure payment via M-Pesa</p>
            <p>✓ Instant access upon confirmation</p>
          </div>
        </div>

        <div className="benefits-card card">
          <h3>What You Get</h3>
          <div className="benefits-list">
            <div className="benefit-item">
              <span className="benefit-icon">🔍</span>
              <div>
                <h4>Smart Detection</h4>
                <p>Advanced AI finds unusual patterns automatically</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📊</span>
              <div>
                <h4>Visual Analytics</h4>
                <p>Beautiful charts and insights</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">⚡</span>
              <div>
                <h4>Real-time Updates</h4>
                <p>Get alerts instantly</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔒</span>
              <div>
                <h4>Bank-level Security</h4>
                <p>Your data is always protected</p>
              </div>
            </div>
          </div>

          <Link to="/login" className="btn btn-secondary btn-full">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

