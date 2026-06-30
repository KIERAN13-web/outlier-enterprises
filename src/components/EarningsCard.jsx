import { useState, useEffect } from 'react';
import { auth } from '../firebase/client';
import walletApi, { markNotificationRead } from '../api/walletApi';
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

  const MIN_WITHDRAWAL = 1000;
  const canWithdraw = wallet.availableBalance >= MIN_WITHDRAWAL;
  const referralStats = wallet.referralStats || { totalReferred: 0, activeReferred: 0, maxReferralWithdrawal: 0 };
  const totalReferred = referralStats.totalReferred || 0;
  const activeReferred = referralStats.activeReferred || 0;
  const maxReferralWithdrawal = referralStats.maxReferralWithdrawal || 0;

  return (
    <>
      {user?.notifications?.length > 0 && (
        <div className="notification-banner">
          <div className="notification-message">{user.notifications[0].message}</div>
          <div className="notification-actions">
            <button
              className="btn-dismiss"
              onClick={async () => {
                try {
                  const token = await auth.currentUser.getIdToken();
                  await markNotificationRead(token, user.notifications[0].id);
                  // refresh
                  const res = await walletApi.getWallet(token);
                  setWallet(res.wallet);
                  setUser(res.user);
                } catch (e) {
                  console.error('Unable to dismiss notification', e);
                }
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
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

          <div className="referral-stats-card">
            <div className="referral-stats-header">
              <h4>👥 Referral Progress</h4>
              <span className="earnings-badge small">Ref</span>
            </div>
            <div className="referral-stats-grid">
              <div className="referral-stat-box">
                <span className="label">Referred</span>
                <span className="amount">{totalReferred}</span>
              </div>
              <div className="referral-stat-box">
                <span className="label">Activated</span>
                <span className="amount">{activeReferred}</span>
              </div>
              <div className="referral-stat-box">
                <span className="label">Max Cashout</span>
                <span className="amount">KES {maxReferralWithdrawal.toLocaleString()}</span>
              </div>
            </div>
            <p className="referral-stats-note">
              Every active referral increases your referral cash-out limit by KES 50. Task withdrawals need 20 active referrals.
            </p>
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
          </div>

          {/* Withdrawal Section */}
          {wallet.availableBalance > 0 ? (
            <div className="withdrawal-section">
              <button
                onClick={() => setShowWithdrawalModal(true)}
                className="btn-withdraw"
              >
                Withdraw Funds
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
        minWithdrawal={MIN_WITHDRAWAL}
        earningType="task"
      />
    </>
  );
}
