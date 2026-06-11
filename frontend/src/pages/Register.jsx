import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { auth, database } from '../firebase/client';
import authApi from '../api/authApi';
import paymentApi from '../api/paymentApi';
import './Auth.css';

const africanCountries = [
  'Kenya',
  'Nigeria',
  'South Africa',
  'Egypt',
  'Ghana',
  'Tanzania',
  'Uganda',
  'Rwanda',
  'Ethiopia',
  'Morocco',
  'Algeria',
  'Senegal',
  'Cameroon',
  'Zimbabwe',
  'Zambia',
  'Botswana',
  'Namibia',
  'Mauritius',
  'Madagascar',
  'Mozambique',
  'Sudan',
  'Tunisia',
  'Angola',
  'Ivory Coast',
  'Sierra Leone',
  'Burundi',
  'Lesotho',
  'Libya',
];

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('mpesa');

  const [step, setStep] = useState(1); // 1=profile, 2=payment
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [paymentCode, setPaymentCode] = useState('');
  const [simulationBusy, setSimulationBusy] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');
  const isDevMode = import.meta.env.MODE !== 'production';

  const navigate = useNavigate();
  // capture referral code from hash (#/register?ref=...)
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

    if (!fullName || !country || !idNumber || !email || !password || !confirmPassword) {
      setError('Name, country, ID number, email, password, and confirm password are required');
      setBusy(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password do not match');
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
    let popup;
    try {
      if (provider === 'manual' && !paymentCode) {
        throw new Error('Please enter your M-Pesa payment code before submitting manual payment.');
      }

      if (provider === 'pesapal') {
        popup = window.open('', 'pesapal', 'width=700,height=800');
      }

      const result = provider === 'mpesa'
        ? await paymentApi.createStkPushGuest({
            email,
            password,
            phoneNumber,
            name: fullName,
            country,
            idNumber,
            referralCode: initialReferral,
          })
        : provider === 'pesapal'
          ? await paymentApi.createPesapalGuest({
              name: fullName,
              email,
              password,
              phoneNumber,
              country,
              idNumber,
              referralCode: initialReferral,
            })
          : await paymentApi.createManualGuest({
              name: fullName,
              email,
              password,
              phoneNumber,
              country,
              idNumber,
              referralCode: initialReferral,
              paymentCode,
            });

      if (provider === 'pesapal' && (!result.iframeUrl || !result.pendingId)) {
        throw new Error('Pesapal initialization failed. Please check backend configuration.');
      }

      setSuccess(true);
      setPendingId(result.pendingId);
      // Store provider for use in PaymentStatus page
      localStorage.setItem('paymentProvider', provider);
      if (provider === 'pesapal' && result.iframeUrl) {
        if (!popup || popup.closed) {
          popup = window.open(result.iframeUrl, 'pesapal', 'width=700,height=800');
        } else {
          popup.location.href = result.iframeUrl;
        }
      }
      if (provider === 'pesapal' && !isDevMode) {
        setTimeout(() => navigate(`/payment-status/${result.pendingId}`, { replace: true }), 500);
      }
    } catch (err) {
      if (popup && !popup.closed) {
        popup.close();
      }
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
                placeholder=""
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              >
                {africanCountries.map((countryName) => (
                  <option key={countryName} value={countryName}>
                    {countryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="idNumber">ID Number</label>
              <input
                id="idNumber"
                type="text"
                placeholder="12345678"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button disabled={busy} type="submit" className="btn btn-primary btn-full">
              {busy ? 'Saving details...' : 'Continue to payment'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onPay} className="auth-form">
            {success && (
              <div className="success-message">
                ✓ {provider === 'manual' ? 'Manual payment request recorded. Wait for admin approval.' : 'Payment request sent! Redirecting...'}
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
                <label>
                  <input type="radio" name="provider" value="manual" checked={provider === 'manual'} onChange={() => setProvider('manual')} /> Manual
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
                required={provider !== 'pesapal'}
              />
              <small>
                {provider === 'mpesa'
                  ? 'Enter your M-Pesa registered phone number'
                  : provider === 'manual'
                    ? 'Use till number 3480163 to complete manual payment'
                    : 'Optional for Pesapal payment'}
              </small>
            </div>

            {provider === 'manual' && (
              <>
                <div className="form-group">
                  <label htmlFor="paymentCode">M-Pesa Payment Code</label>
                  <input
                    id="paymentCode"
                    type="text"
                    placeholder="Enter your MPESA code (e.g. QAZ12345)"
                    value={paymentCode}
                    onChange={(e) => setPaymentCode(e.target.value)}
                    disabled={success}
                    required
                  />
                  <small>Enter the M-Pesa payment/reference code shown after your payment.</small>
                </div>
                <div className="manual-payment-card card">
                  <h4>Manual Payment</h4>
                  <p>Pay KES 200 using till number <strong>3480163</strong>.</p>
                  <p>Then enter the payment code above and submit your request. Admins will review it for approval.</p>
                </div>
              </>
            )}

            <button disabled={busy || success} type="submit" className="btn btn-primary btn-full">
              {busy
                ? provider === 'mpesa'
                  ? 'Processing...'
                  : provider === 'pesapal'
                    ? 'Initializing Pesapal...'
                    : 'Saving manual request...'
                : provider === 'mpesa'
                  ? 'Pay KES 200'
                  : provider === 'pesapal'
                    ? 'Pay with Pesapal'
                    : 'Submit manual payment request'}
            </button>

            {success && provider === 'manual' && (
              <div className="manual-login-cta" style={{ marginTop: '16px' }}>
                <p>Your manual payment request is submitted. Admins will review the code and approve your account.</p>
                <Link to="/login" className="btn btn-secondary btn-full">Back to Login</Link>
              </div>
            )}

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
