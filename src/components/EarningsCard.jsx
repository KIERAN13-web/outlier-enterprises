import { useState, useEffect } from 'react';
import { auth } from '../firebase/client';
import walletApi from '../api/walletApi';
import WithdrawalModal from './WithdrawalModal';
import './EarningsCard.css';

export default function EarningsCard() {
  const [wallet, setWallet] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const token = await currentUser.getIdToken();
        const response = await walletApi.getWallet(token);

        setWallet(response.wallet);
        setUser(response.user);
        setError('');
      } catch (err) {
        console.error('Failed to fetch wallet:', err);
        setError('Failed to load earnings');
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
  }, []);

  if (loading) {
    return <div className="earnings-card loading">Loading earnings...</div>;
  }

  if (!wallet) {
    return null;
  }

  const MIN_WITHDRAWAL = 15000;
  const canWithdraw = wallet.availableBalance >= MIN_WITHDRAWAL;

  return (
    <>
      <div className="earnings-card">
        <div className="earnings-header">
          <h3>💰 Your Earnings</h3>
          <div className="earnings-badge">{wallet.availableBalance > 0 ? '✓' : '—'}</div>
        </div>

        <div className="earnings-content">
          {/* Balance Section */}
          <div className="balance-section">
            <div className="balance-item primary">
              <span className="label">Available Balance</span>
              <span className="amount">KES {(wallet.availableBalance || 0).toLocaleString()}</span>
            </div>

            <div className="balance-item secondary">
              <span className="label">Total Earned</span>
              <span className="amount">KES {(wallet.totalEarnings || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* User Info Section */}
          <div className="user-info-section">
            <div className="info-item">
              <span className="info-label">Name</span>
              <span className="info-value">{user?.name || 'User'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{user?.email || 'N/A'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Phone (Payment)</span>
              <span className="info-value">{user?.phoneNumber || 'N/A'}</span>
            </div>
          </div>

          {user?.referralCode && (
            <div className="referral-section">
              <label>Your referral link</label>
              <div className="referral-row">
                <input
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}#/register?ref=${user.referralCode}`}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => {
                    const text = `${window.location.origin}${window.location.pathname}#/register?ref=${user.referralCode}`;
                    navigator.clipboard?.writeText(text).then(() => {
                      // silent success
                    }).catch(() => {});
                  }}
                  className="btn-copy"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Withdrawal Section */}
          {wallet.availableBalance > 0 ? (
            <div className="withdrawal-section">
              {!canWithdraw && (
                <p className="withdrawal-notice">
                  Minimum withdrawal: KES {MIN_WITHDRAWAL}
                </p>
              )}

              <button
                onClick={() => setShowWithdrawalModal(true)}
                disabled={!canWithdraw}
                className={`btn-withdraw ${!canWithdraw ? 'disabled' : ''}`}
              >
                {canWithdraw ? 'Withdraw Funds' : 'Need More Balance'}
              </button>
            </div>
          ) : (
            <div className="no-balance">
              <p>Complete tasks to earn money</p>
            </div>
          )}
        </div>
      </div>

      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        availableBalance={wallet.availableBalance || 0}
        userPhone={user?.phoneNumber || ''}
      />
    </>
  );
}
