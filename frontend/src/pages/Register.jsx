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
  const [provider, setProvider] = useState('pesapal');
  const [referralCode, setReferralCode] = useState(() => {
    try {
      const search = window.location.search || '';
      if (search) {
        const params = new URLSearchParams(search);
        const ref = params.get('ref');
        if (ref) return ref;
      }
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const params = new URLSearchParams(hash.slice(qIndex + 1));
        return params.get('ref');
      }
    } catch (e) {
      return null;
    }
    return null;
  });

  const [step, setStep] = useState(1); // 1=profile, 2=payment
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
  
  const handlePaymentMethodChange = (method) => {
    setError('');
    setProvider(method);
  };

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
    setCheckoutUrl('');

    try {
      let result;
      if (provider === 'pesapal') {
        result = await paymentApi.createPesapalGuest({
          name: fullName,
          email,
          password,
          phoneNumber,
          country,
          idNumber,
          referralCode,
        });
        if (!result?.pendingId) {
          throw new Error('Pesapal initialization failed. Please check backend configuration.');
        }
        setCheckoutUrl(result.iframeUrl || '');
      } else if (provider === 'mpesa') {
        result = await paymentApi.createStkPushGuest({
          name: fullName,
          email,
          password,
          phoneNumber,
          country,
          idNumber,
          referralCode,
        });
        if (!result?.pendingId) {
          throw new Error('M-Pesa STK push initialization failed. Please check your phone number and try again.');
        }
      } else {
        throw new Error('Unsupported payment method');
      }

      setSuccess(true);
      setPendingId(result.pendingId);
      localStorage.setItem('paymentProvider', provider);
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
            {success && provider === 'mpesa' && (
              <div className="success-message">
                ✓ M-Pesa STK push initialized. Approve the payment prompt on your phone.
                {pendingId && (
                  <p style={{ marginTop: '8px' }}>
                    You can also check payment status on the <Link to={`/payment-status/${pendingId}`}>status page</Link>.
                  </p>
                )}
              </div>
            )}
            {success && provider === 'pesapal' && checkoutUrl && (
              <div className="success-message">
                ✓ Pesapal payment initialized successfully.
                <div style={{ marginTop: '12px' }}>
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full">
                    Continue to Pesapal checkout
                  </a>
                  {pendingId && (
                    <p style={{ marginTop: '8px' }}>
                      After payment, check your payment status on the <Link to={`/payment-status/${pendingId}`}>status page</Link>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {referralCode && (
              <div className="info-message">
                Referral code <strong>{referralCode}</strong> is applied. The referrer will earn KES 50 once your account is approved.
              </div>
            )}

            <div className="form-group">
              <label>Payment Method</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label>
                  <input type="radio" name="provider" value="pesapal" checked={provider === 'pesapal'} onChange={() => handlePaymentMethodChange('pesapal')} /> Pesapal
                </label>
                <label>
                  <input type="radio" name="provider" value="mpesa" checked={provider === 'mpesa'} onChange={() => handlePaymentMethodChange('mpesa')} /> M-Pesa STK
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                {provider === 'mpesa'
                  ? 'Phone Number'
                  : 'Phone Number (optional)'}
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="07XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={success}
                required={provider === 'mpesa'}
              />
              <small>
                {provider === 'mpesa'
                  ? 'Enter your M-Pesa registered phone number.'
                  : 'Optional for Pesapal payment.'}
              </small>
            </div>

            <button disabled={busy || success} type="submit" className="btn btn-primary btn-full">
              {busy
                ? provider === 'pesapal'
                  ? 'Initializing Pesapal...'
                  : 'Initializing M-Pesa STK...'
                : provider === 'pesapal'
                  ? 'Pay with Pesapal'
                  : 'Pay with M-Pesa STK'}
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
