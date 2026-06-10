import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/client';
import authApi from '../api/authApi';
import './Auth.css';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword) {
      setError('Current password is required');
      setBusy(false);
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      setBusy(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setBusy(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setBusy(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      setBusy(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        setBusy(false);
        return;
      }

      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password via Firebase client SDK first
      await updatePassword(user, newPassword);

      // Also notify backend (optional for logging/sync purposes)
      try {
        const token = await user.getIdToken();
        await authApi.changePassword(token, newPassword);
      } catch (backendErr) {
        console.warn('Backend password change notification failed:', backendErr);
        // Don't fail the whole operation if backend call fails
      }

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else if (err.code === 'auth/weak-password') {
        setError('New password is too weak. Use at least 6 characters');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Please log out and log in again before changing your password');
      } else {
        setError(err.message || 'Failed to change password');
      }
      setBusy(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <h2>Change Password</h2>
          <p>Update your account password</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #c3e6cb' }}>{success}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={busy}
              minLength="6"
            />
            <small style={{ color: '#666', marginTop: '0.25rem', display: 'block' }}>
              Minimum 6 characters
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={busy}
              minLength="6"
            />
          </div>

          <button disabled={busy} type="submit" className="btn btn-primary btn-full">
            {busy ? 'Changing password...' : 'Change Password'}
          </button>
        </form>

        <div className="auth-footer">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
