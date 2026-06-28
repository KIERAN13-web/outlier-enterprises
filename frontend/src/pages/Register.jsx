import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { auth, database } from '../firebase/client';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  async function onCreateAccount(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    if (!fullName || !country || !idNumber || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      setBusy(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password must match.');
      setBusy(false);
      return;
    }

    if (!auth) {
      setError('Firebase is not configured correctly.');
      setBusy(false);
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;
      const now = new Date().toISOString();

      await set(ref(database, `users/${uid}`), {
        email,
        fullName,
        country,
        idNumber,
        phoneNumber: phoneNumber || null,
        referralCode: null,
        isPaid: false,
        paidAt: null,
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      });

      await set(ref(database, `users/${uid}/wallet`), {
        taskBalance: 0,
        referralBalance: 0,
        totalEarnings: 0,
        updatedAt: now,
      });

      setSuccess(true);
      setMessage('Account created successfully. You can now use the dashboard and activate later.');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (err) {
      console.error(err);
      let message = 'Account creation failed. Please try again.';
      const code = err?.code || '';
      if (typeof code === 'string') {
        if (code.includes('auth/email-already-in-use')) {
          message = 'That email is already registered. Please log in.';
        } else if (code.includes('auth/invalid-email')) {
          message = 'Invalid email address.';
        } else if (code.includes('auth/weak-password')) {
          message = 'Password must be at least 6 characters.';
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
          <h2>Create Account</h2>
          <p>Register now and start using the dashboard. Activate your account later to enable withdrawals.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && message && <div className="success-message">{message}</div>}

        <form onSubmit={onCreateAccount} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your full name"
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
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="07XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <small>Phone number is optional now. You can activate your account later.</small>
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
            {busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="toggle-auth">Login</Link>
          </p>
        </div>

        <div className="auth-links">
          <Link to="/payment">Activate account</Link>
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
