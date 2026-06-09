import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/client';
import paymentApi from '../api/paymentApi';
import './Payment.css';

export default function Payment() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
      await paymentApi.createStkPush(token, phoneNumber);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="payment-container container">
      <div className="payment-header">
        <h1>Transparent Access</h1>
        <p>Initialize your enterprise auditing environment</p>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card card">
          <div className="pricing-header">
            <h3>Standard License</h3>
            <div className="price">
              <span className="currency">KES</span>
              <span className="amount">200</span>
              <span className="period">/ lifetime</span>
            </div>
          </div>

          <ul className="features-list">
            <li><i className="ti ti-circle-check"></i> Unlimited account analysis</li>
            <li><i className="ti ti-circle-check"></i> Real-time outlier detection</li>
            <li><i className="ti ti-circle-check"></i> Advanced behavioral reports</li>
            <li><i className="ti ti-circle-check"></i> Full telemetry export</li>
            <li><i className="ti ti-circle-check"></i> Priority incident response</li>
          </ul>

          <form onSubmit={onPay} className="payment-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message"><i className="ti ti-check"></i> Transaction initialized. Check your device.</div>}

            <div className="form-group">
              <label htmlFor="phone">M-Pesa Terminal Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="07XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={success}
                required
              />
              <small>Registered Safaricom M-Pesa number required</small>
            </div>

            <button
              disabled={busy || success}
              type="submit"
              className="btn btn-primary btn-full"
            >
              {busy ? 'Initializing STK...' : success ? 'Deployment Started' : 'Initialize License'}
            </button>
          </form>

          <div className="payment-note">
            <p><i className="ti ti-lock"></i> Encrypted Transaction Tunnel</p>
          </div>
        </div>

        <div className="benefits-card card">
          <h3>License Benefits</h3>
          <div className="benefits-list">
            <div className="benefit-item">
              <span className="benefit-icon"><i className="ti ti-brain"></i></span>
              <div>
                <h4>Smart Detection</h4>
                <p>Advanced neural patterns identified automatically via local inference.</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon"><i className="ti ti-chart-pie-2"></i></span>
              <div>
                <h4>Deep Analytics</h4>
                <p>High-fidelity visualization of financial telemetry and deviations.</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon"><i className="ti ti-bolt"></i></span>
              <div>
                <h4>Instant Signal</h4>
                <p>Zero-latency alerts on critical outlier thresholds.</p>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon"><i className="ti ti-shield-check"></i></span>
              <div>
                <h4>Hardened Security</h4>
                <p>Data residency and encryption following ISO 27001 standards.</p>
              </div>
            </div>
          </div>

          <Link to="/login" className="btn btn-outline btn-full">
            <i className="ti ti-arrow-back-up"></i> Return to Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}
