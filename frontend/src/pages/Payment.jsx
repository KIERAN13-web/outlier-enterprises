import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, database } from '../firebase/client';
import { get, ref } from 'firebase/database';
import paymentApi from '../api/paymentApi';
import './Payment.css';

export default function Payment() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [checkingPaid, setCheckingPaid] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkPaid() {
      const user = auth.currentUser;
      if (!user || !database) {
        setCheckingPaid(false);
        return;
      }

      try {
        const paidSnap = await get(ref(database, `users/${user.uid}/isPaid`));
        setIsPaid(paidSnap.exists() && Boolean(paidSnap.val()));
      } catch (err) {
        console.error('Failed to read paid status from RTDB', err);
      } finally {
        setCheckingPaid(false);
      }
    }

    checkPaid();
  }, []);

  async function onPay(e) {
    e.preventDefault();
    if (isPaid) return;

    setBusy(true);
    setError('');
    setCheckoutUrl('');
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      const token = await user.getIdToken();
      const resp = await paymentApi.createPesapalInit(token);
      if (resp && resp.pendingId) {
        setPendingId(resp.pendingId);
        setCheckoutUrl(resp.iframeUrl || '');
        setSuccess(true);
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
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
        <h1>Activate Your Account</h1>
        <p>Pay KES 200 via Pesapal (PayPal) to unlock withdrawals and retain dashboard access.</p>
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
            {success && checkoutUrl && (
              <div className="success-message">
                <i className="ti ti-check"></i> Pesapal payment initialized successfully.
                <div style={{ marginTop: '12px' }}>
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full">
                    Continue to Pesapal checkout
                  </a>
                  {pendingId && (
                    <p style={{ marginTop: '8px' }}>
                      After payment, check status on the <Link to={`/payment-status/${pendingId}?provider=pesapal`}>payment status page</Link>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {checkingPaid ? (
              <div className="info-message">Checking activation status...</div>
            ) : isPaid ? (
              <div className="success-message">
                <i className="ti ti-check"></i> Your account is active. No further activation payment is required.
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Payment Method</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label>
                      <input type="radio" name="provider" value="pesapal" checked readOnly /> Pesapal (PayPal)
                    </label>
                  </div>
                  <small>Only Pesapal is supported for account activation.</small>
                </div>

                <button
                  disabled={busy}
                  type="submit"
                  className="btn btn-primary btn-full"
                >
                  {busy ? 'Initializing Pesapal...' : 'Pay with Pesapal'}
                </button>
              </>
            )}
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
