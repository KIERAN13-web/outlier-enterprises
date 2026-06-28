import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/client';
import walletApi from '../api/walletApi';
import WithdrawalModal from './WithdrawalModal';
import './EarningsCard.css';

export default function EarningsCard() {
  const [wallet, setWallet] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskWithdrawal, setShowTaskWithdrawal] = useState(false);
  const [showReferralWithdrawal, setShowReferralWithdrawal] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchWallet();
  }, []);

  if (loading) {
    return <div className="earnings-card loading">Loading earnings...</div>;
  }

  if (!wallet) {
    return null;
  }

  const taskBalance = wallet.taskBalance || 0;
  const referralBalance = wallet.referralBalance || 0;
  const totalBalance = taskBalance + referralBalance;

  const MIN_TASK_WITHDRAWAL = 1000;
  const MIN_REFERRAL_WITHDRAWAL = 1;
  const isPaid = user?.isPaid === true;
  
  const canWithdrawTask = isPaid && taskBalance >= MIN_TASK_WITHDRAWAL;
  const canWithdrawReferral = isPaid && referralBalance >= MIN_REFERRAL_WITHDRAWAL;

  return (
    <>
      <div className="earnings-container">
        {/* Summary Card */}
        <div className="earnings-summary">
          <div className="summary-header">
            <h3>💰 Your Earnings Summary</h3>
          </div>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-label">Total Balance</span>
              <span className="stat-amount">KES {totalBalance.toLocaleString()}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Total Earned</span>
              <span className="stat-amount">KES {(wallet.totalEarnings || 0).toLocaleString()}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Total Withdrawn</span>
              <span className="stat-amount">KES {(wallet.totalWithdrawn || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* User Info Section */}
          <div className="user-info-section">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{user?.name || 'User'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Phone:</span>
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
                    navigator.clipboard?.writeText(text).catch(() => {});
                  }}
                  className="btn-copy"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {!isPaid && (
            <div className="activation-banner">
              <div>
                <strong>Account activation required</strong>
                <p>Activate your account with KES 200 to unlock withdrawals.</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/payment')}>
                Activate account
              </button>
            </div>
          )}
        </div>

        {/* Task Earnings Card */}
        {user?.notifications?.length > 0 && (
          <div className="notification-banner">
            <div className="notification-message">{user.notifications[0].message}</div>
            <div className="notification-actions">
              <button
                className="btn-dismiss"
                onClick={async () => {
                  try {
                    const token = await auth.currentUser.getIdToken();
                    await walletApi.markNotificationRead(token, user.notifications[0].id);
                    const res = await walletApi.getWallet(token);
                    // refresh
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
            <h4>📋 Earned from Tasks</h4>
            <span className="earning-badge">Tasks</span>
          </div>
          <div className="earnings-content">
            <div className="balance-display">
              <span className="label">Available Balance</span>
              <span className="amount">KES {taskBalance.toLocaleString()}</span>
            </div>
            {taskBalance > 0 ? (
              <button
                onClick={() => setShowTaskWithdrawal(true)}
                className="btn-withdraw"
                disabled={!canWithdrawTask}
              >
                {isPaid ? 'Withdraw from Tasks' : 'Activate to withdraw'}
              </button>
            ) : (
              <p className="no-balance-text">Complete tasks to earn money</p>
            )}
          </div>
        </div>

        {/* Referral Earnings Card */}
        <div className="earnings-card">
          <div className="earnings-header">
            <h4>👥 Earned from Referrals</h4>
            <span className="earning-badge">Referrals</span>
          </div>
          <div className="earnings-content">
            <div className="balance-display">
              <span className="label">Available Balance</span>
              <span className="amount">KES {referralBalance.toLocaleString()}</span>
            </div>
            <div className="min-withdrawal-note">Min withdrawal: KES {MIN_REFERRAL_WITHDRAWAL}</div>
            {referralBalance > 0 ? (
              <button
                onClick={() => setShowReferralWithdrawal(true)}
                disabled={!canWithdrawReferral}
                className={`btn-withdraw ${!canWithdrawReferral ? 'disabled' : ''}`}
              >
                {isPaid ? (canWithdrawReferral ? 'Withdraw from Referrals' : 'Insufficient balance') : 'Activate to withdraw'}
              </button>
            ) : (
              <p className="no-balance-text">Refer friends to earn money</p>
            )}
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="withdrawal-history">
          <h4>📊 Withdrawal History</h4>
          {wallet.withdrawals?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {wallet.withdrawals.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.requestedAt).toLocaleDateString()}</td>
                    <td>{item.earningType || 'N/A'}</td>
                    <td>KES {item.amount.toLocaleString()}</td>
                    <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No withdrawal history yet.</p>
          )}
        </div>
      </div>

      <WithdrawalModal
        isOpen={showTaskWithdrawal}
        onClose={() => setShowTaskWithdrawal(false)}
        availableBalance={taskBalance}
        userPhone={user?.phoneNumber || ''}
        minWithdrawal={MIN_TASK_WITHDRAWAL}
        earningType="task"
        onWithdrawSuccess={fetchWallet}
      />

      <WithdrawalModal
        isOpen={showReferralWithdrawal}
        onClose={() => setShowReferralWithdrawal(false)}
        availableBalance={referralBalance}
        userPhone={user?.phoneNumber || ''}
        minWithdrawal={MIN_REFERRAL_WITHDRAWAL}
        earningType="referral"
        onWithdrawSuccess={fetchWallet}
      />
    </>
  );
}
