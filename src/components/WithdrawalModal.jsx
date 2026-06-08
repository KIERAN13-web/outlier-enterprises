import { useState } from 'react';
import { auth } from '../firebase/client';
import walletApi from '../api/walletApi';
import './WithdrawalModal.css';

export default function WithdrawalModal({ isOpen, onClose, availableBalance, userPhone }) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(userPhone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const MIN_WITHDRAWAL = 15000;
  const isValidAmount = amount && parseInt(amount) >= MIN_WITHDRAWAL && parseInt(amount) <= availableBalance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (parseInt(amount) < MIN_WITHDRAWAL) {
        throw new Error(`Minimum withdrawal is KES ${MIN_WITHDRAWAL}`);
      }

      if (parseInt(amount) > availableBalance) {
        throw new Error('Insufficient balance');
      }

      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      const user = auth.currentUser;
      const token = await user.getIdToken();

      await walletApi.withdraw(token, {
        amount: parseInt(amount),
        phoneNumber,
      });

      setSuccess(true);
      setTimeout(() => {
        setAmount('');
        setPhoneNumber(userPhone || '');
        onClose();
        window.location.reload(); // Refresh to get updated balance
      }, 2000);
    } catch (err) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="success-message">
            <h2>✓ Withdrawal Requested!</h2>
            <p>Your withdrawal of KES {amount} has been requested.</p>
            <p>You will receive the funds within 24 hours.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Withdraw Funds</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Available Balance</label>
            <div className="balance-display">KES {availableBalance.toLocaleString()}</div>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Withdrawal Amount *</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min: KES ${MIN_WITHDRAWAL}`}
              min={MIN_WITHDRAWAL}
              max={availableBalance}
              required
            />
            <small>Minimum withdrawal: KES {MIN_WITHDRAWAL}</small>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number for Withdrawal *</label>
            <input
              id="phone"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              required
            />
            <small>Where you want to receive the funds</small>
          </div>

          {amount && (
            <div className="withdrawal-info">
              <p><strong>You will receive:</strong> KES {parseInt(amount || 0).toLocaleString()}</p>
              <p><strong>Remaining balance:</strong> KES {(availableBalance - parseInt(amount || 0)).toLocaleString()}</p>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !isValidAmount}
            >
              {loading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
