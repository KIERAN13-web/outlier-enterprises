import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
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
      setError('New password must be different');
      setBusy(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Not authenticated');
        setBusy(false);
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      try {
        const token = await user.getIdToken();
        await authApi.changePassword(token, newPassword);
      } catch (backendErr) {
        console.warn('Backend notify failed:', backendErr);
      }

      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') setError('Current password is incorrect');
      else if (err.code === 'auth/weak-password') setError('New password is too weak');
      else setError(err.message || 'Failed to change password');
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
            <label>Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={busy} required />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={busy} required minLength={6} />
            <small style={{ color: '#666', marginTop: '0.25rem', display: 'block' }}>Minimum 6 characters</small>
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={busy} required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Changing...' : 'Change Password'}</button>
        </form>

        <div className="auth-footer">
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} disabled={busy} style={{ width: '100%', marginTop: '1rem' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
