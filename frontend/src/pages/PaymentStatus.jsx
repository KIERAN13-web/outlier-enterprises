import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import paymentApi from '../api/paymentApi';
import './Auth.css';

export default function PaymentStatus() {
  const { pendingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('PENDING');
  const [message, setMessage] = useState('Waiting for payment confirmation...');
  const [busy, setBusy] = useState(true);
  const [simulationBusy, setSimulationBusy] = useState(false);
  const [error, setError] = useState('');
  const isDevMode = import.meta.env.MODE !== 'production';
  const storedProvider = localStorage.getItem('paymentProvider');
  const queryProvider = searchParams.get('provider');
  const provider = queryProvider || storedProvider || 'mpesa';

  useEffect(() => {
    let intervalId;

    async function fetchStatus() {
      try {
        let response;
        if (provider === 'pesapal') {
          response = await paymentApi.getPesapalPaymentStatus(pendingId);
        } else {
          response = await paymentApi.getPaymentStatus(pendingId);
        }

        setStatus(response.status || 'PENDING');
        setBusy(false);
        if (response.status === 'COMPLETED') {
          setMessage('Payment confirmed. Account created successfully! Redirecting to login...');
          clearInterval(intervalId);
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        } else if (response.status === 'FAILED') {
          setMessage('Payment failed or was declined. Please try again.');
          clearInterval(intervalId);
        } else {
          setMessage('Waiting for payment confirmation...');
        }
      } catch (err) {
        console.error(err);
        setError('Unable to check payment status right now. Please refresh in a moment.');
        setBusy(false);
        clearInterval(intervalId);
      }
    }

    fetchStatus();
    intervalId = setInterval(fetchStatus, 3000);

    return () => clearInterval(intervalId);
  }, [navigate, pendingId, provider]);

  async function onSimulateWebhook() {
    setSimulationBusy(true);
    setError('');

    try {
      await paymentApi.simulateWebhook(pendingId, 'SUCCESS');
      setMessage('Simulated payment received. Refreshing status...');
      
      // Get updated status using the stored provider
      let response;
      if (provider === 'pesapal') {
        response = await paymentApi.getPesapalPaymentStatus(pendingId);
      } else {
        response = await paymentApi.getPaymentStatus(pendingId);
      }
      setStatus(response.status || 'PENDING');
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
          <h2>Payment Confirmation</h2>
          <p>{message}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Payment Status</label>
          <input type="text" value={status} readOnly />
        </div>

        <div className="auth-footer">
          <p>
            If this page does not update, you can{' '}
            <button type="button" className="toggle-auth" onClick={() => window.location.reload()}>
              refresh
            </button>{' '}
            or try again later.
          </p>
        </div>
        {isDevMode && status === 'PENDING' && (
          <div className="form-group">
            <button
              type="button"
              className="btn btn-secondary btn-full"
              disabled={simulationBusy}
              onClick={onSimulateWebhook}
            >
              {simulationBusy ? 'Simulating payment...' : 'Simulate payment completion'}
            </button>
            <small>This local app uses a placeholder payment flow, so you can simulate the webhook callback.</small>
          </div>
        )}

        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
          <Link to="/register">Back to Register</Link>
        </div>
      </div>
    </div>
  );
}
