import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database } from '../firebase/client';
import { get, ref } from 'firebase/database';
import walletApi from '../api/walletApi';
import WithdrawalModal from './WithdrawalModal';
import './EarningsCard.css';

export default function EarningsCard() {
  const [wallet, setWallet] = useState(null);
  const [user, setUser] = useState(null);
  const [paidStatus, setPaidStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskWithdrawal, setShowTaskWithdrawal] = useState(false);
  const [showReferralWithdrawal, setShowReferralWithdrawal] = useState(false);
  const [showActivationPrompt, setShowActivationPrompt] = useState(false);
  const navigate = useNavigate();

  const fetchPaidStatus = async (uid) => {
    if (!uid || !database) return false;

    try {
      const paidSnap = await get(ref(database, `users/${uid}/isPaid`));
      return paidSnap.exists() && Boolean(paidSnap.val());
    } catch (err) {
      console.error('Failed to read paid status from RTDB', err);
      return false;
    }
  };

  const fetchWallet = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await walletApi.getWallet(token);
      const activeStatus = await fetchPaidStatus(currentUser.uid);

      setWallet(response.wallet);
      setUser(response.user);
      setPaidStatus(activeStatus);
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
  const referralStats = wallet.referralStats || { totalReferred: 0, activeReferred: 0, maxReferralWithdrawal: 0 };
  const totalReferred = referralStats.totalReferred || 0;
  const activeReferred = referralStats.activeReferred || 0;
  const maxReferralWithdrawal = referralStats.maxReferralWithdrawal || 0;

  const MIN_TASK_WITHDRAWAL = 1000;
  const MIN_REFERRAL_WITHDRAWAL = 1;
  const isPaid = paidStatus === true || user?.isPaid === true;
  
  const canWithdrawTask = isPaid && taskBalance >= MIN_TASK_WITHDRAWAL && activeReferred >= 20;
  const canWithdrawReferral = isPaid && referralBalance >= MIN_REFERRAL_WITHDRAWAL && maxReferralWithdrawal >= MIN_REFERRAL_WITHDRAWAL;

  const handleWithdrawClick = (type) => {
    if (isPaid) {
      if (type === 'task') {
        setShowTaskWithdrawal(true);
      } else {
        setShowReferralWithdrawal(true);
      }
      return;
    }

    setShowActivationPrompt(true);
    setShowTaskWithdrawal(false);
    setShowReferralWithdrawal(false);
  };

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

          <div className="referral-stats-card">
            <div className="referral-stats-header">
              <h4>👥 Referral Progress</h4>
              <span className="earning-badge">Referrals</span>
            </div>
            <div className="referral-stats-grid">
              <div className="referral-stat-box">
                <span className="stat-label">Referred</span>
                <span className="stat-amount">{totalReferred}</span>
              </div>
              <div className="referral-stat-box">
                <span className="stat-label">Activated</span>
                <span className="stat-amount">{activeReferred}</span>
              </div>
              <div className="referral-stat-box">
                <span className="stat-label">Max referral cashout</span>
                <span className="stat-amount">KES {maxReferralWithdrawal.toLocaleString()}</span>
              </div>
            </div>
            <p className="referral-stats-note">
              Every active referral raises your referral withdrawal limit by KES 50. You need at least 20 active referrals before task earnings can be withdrawn.
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
                      navigator.clipboard?.writeText(text).catch(() => {});
                    }}
                    className="btn-copy"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isPaid && showActivationPrompt && (
            <div className="activation-panel pending">
              <div>
                <strong>Account activation required</strong>
                <p>Activate your account with KES 1 to unlock withdrawals.</p>
              </div>
              <button className="btn btn-activation" onClick={() => navigate('/payment')}>
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
                onClick={() => handleWithdrawClick('task')}
                className="btn-withdraw"
                disabled={isPaid ? !canWithdrawTask : false}
              >
                {isPaid ? (canWithdrawTask ? 'Withdraw from Tasks' : 'Need 20 active referrals') : 'Activate to withdraw'}
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
            <div className="min-withdrawal-note">Min withdrawal: KES {MIN_REFERRAL_WITHDRAWAL} • Max now: KES {maxReferralWithdrawal.toLocaleString()}</div>
            {referralBalance > 0 ? (
              <button
                onClick={() => handleWithdrawClick('referral')}
                disabled={isPaid ? !canWithdrawReferral : false}
                className={`btn-withdraw ${isPaid && !canWithdrawReferral ? 'disabled' : ''}`}
              >
                {isPaid ? (canWithdrawReferral ? 'Withdraw from Referrals' : 'Referral limit not reached') : 'Activate to withdraw'}
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
        availableBalance={Math.min(referralBalance, maxReferralWithdrawal)}
        userPhone={user?.phoneNumber || ''}
        minWithdrawal={MIN_REFERRAL_WITHDRAWAL}
        earningType="referral"
        onWithdrawSuccess={fetchWallet}
      />
    </>
  );
}
