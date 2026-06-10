import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/client';
import adminApi from '../api/adminApi';
import { clearRedirectPage } from '../utils/pagePersistence';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [idToken, setIdToken] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [fundAmount, setFundAmount] = useState('');
  const [fundReason, setFundReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth) {
      navigate('/login', { replace: true });
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const token = await user.getIdToken();
        setIdToken(token);
        fetchStats(token);
        fetchWithdrawals(token);
      } catch (err) {
        console.error('Failed to get token:', err);
        navigate('/login', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchStats = async (token) => {
    try {
      const result = await adminApi.getDashboardStats(token);
      setStats(result.stats);
    } catch (err) {
      console.error(err);
      setError('Failed to load stats');
    }
  };

  const fetchWithdrawals = async (token) => {
    try {
      const result = await adminApi.getAllWithdrawals(token);
      setWithdrawals(result.withdrawals || []);
    } catch (err) {
      console.error(err);
    }
  };

  const onSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !idToken) return;

    setBusy(true);
    setError('');
    try {
      const result = await adminApi.searchUsers(idToken, searchQuery);
      setSearchResults(result.users || []);
    } catch (err) {
      console.error(err);
      setError('Search failed');
    } finally {
      setBusy(false);
    }
  };

  const onSelectUser = async (uid) => {
    if (!idToken) return;
    setBusy(true);
    setError('');
    try {
      const result = await adminApi.getUserDetails(idToken, uid);
      setUserDetails(result.user);
      setSelectedUser(uid);
    } catch (err) {
      console.error(err);
      setError('Failed to load user details');
    } finally {
      setBusy(false);
    }
  };

  const onFundUser = async () => {
    if (!fundAmount || parseInt(fundAmount) <= 0 || !idToken) {
      setError('Invalid amount');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await adminApi.fundUser(idToken, selectedUser, parseInt(fundAmount), fundReason);
      setError('');
      setFundAmount('');
      setFundReason('');
      // Refresh user details
      const result = await adminApi.getUserDetails(idToken, selectedUser);
      setUserDetails(result.user);
      // Refresh stats
      fetchStats(idToken);
      alert('User funded successfully');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Funding failed');
    } finally {
      setBusy(false);
    }
  };

  const onApproveWithdrawal = async (uid, withdrawalId) => {
    if (!window.confirm('Approve this withdrawal?') || !idToken) return;

    setBusy(true);
    try {
      await adminApi.approveWithdrawal(idToken, uid, withdrawalId);
      await fetchWithdrawals(idToken);
      fetchStats(idToken);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Approval failed');
    } finally {
      setBusy(false);
    }
  };

  const onRejectWithdrawal = async (uid, withdrawalId) => {
    if (!window.confirm('Reject this withdrawal?') || !idToken) return;

    setBusy(true);
    try {
      await adminApi.updateWithdrawal(idToken, uid, withdrawalId, 'rejected');
      await fetchWithdrawals(idToken);
      fetchStats(idToken);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Rejection failed');
    } finally {
      setBusy(false);
    }
  };

  const onMarkPaid = async (uid, withdrawalId) => {
    if (!window.confirm('Mark this withdrawal as paid?') || !idToken) return;

    setBusy(true);
    try {
      await adminApi.markWithdrawalPaid(idToken, uid, withdrawalId);
      await fetchWithdrawals(idToken);
      fetchStats(idToken);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Mark paid failed');
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    try {
      clearRedirectPage();
      await auth.signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🔐 Admin Dashboard</h1>
        <button onClick={onLogout} className="btn btn-secondary">Logout</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users & Transactions
        </button>
        <button
          className={`tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdrawals')}
        >
          Withdrawals ({withdrawals.filter(w => w.status === 'pending').length})
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="admin-section">
          <h2>Dashboard Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{stats.totalUsers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Paid Users</div>
              <div className="stat-value">{stats.paidUsers}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Earnings</div>
              <div className="stat-value">KES {(stats.totalEarnings || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Withdrawals</div>
              <div className="stat-value">{stats.pendingWithdrawals}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Amount</div>
              <div className="stat-value">KES {(stats.pendingWithdrawalAmount || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="admin-section">
          <h2>Search Users</h2>
          <form onSubmit={onSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              required
            />
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="user-list">
              <h3>Results ({searchResults.length})</h3>
              {searchResults.map(user => (
                <div key={user.uid} className="user-item">
                  <div className="user-info">
                    <strong>{user.fullName || user.email}</strong>
                    <small>{user.phoneNumber}</small>
                  </div>
                  <button
                    onClick={() => onSelectUser(user.uid)}
                    className="btn btn-primary btn-sm"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedUser && userDetails && (
            <div className="user-details">
              <h3>User Details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Name:</label>
                  <span>{userDetails.fullName || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Email:</label>
                  <span>{userDetails.email}</span>
                </div>
                <div className="detail-item">
                  <label>Phone:</label>
                  <span>{userDetails.phoneNumber || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Country:</label>
                  <span>{userDetails.country || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>ID Number:</label>
                  <span>{userDetails.idNumber || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span>{userDetails.isPaid ? '✓ Paid' : '✗ Not Paid'}</span>
                </div>
              </div>

              <div className="wallet-info">
                <h4>Wallet Info</h4>
                <div className="wallet-grid">
                  <div className="wallet-item">
                    <label>💼 Task Balance</label>
                    <span>KES {(userDetails.wallet?.taskBalance || 0).toLocaleString()}</span>
                  </div>
                  <div className="wallet-item">
                    <label>👥 Referral Balance</label>
                    <span>KES {(userDetails.wallet?.referralBalance || 0).toLocaleString()}</span>
                  </div>
                  <div className="wallet-item">
                    <label>Total Earnings</label>
                    <span>KES {(userDetails.wallet?.totalEarnings || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="fund-section">
                <h4>Fund User Account</h4>
                <div className="fund-form">
                  <div className="form-group">
                    <label>Amount (KES)</label>
                    <input
                      type="number"
                      min="1"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Amount"
                    />
                  </div>
                  <div className="form-group">
                    <label>Reason</label>
                    <input
                      type="text"
                      value={fundReason}
                      onChange={(e) => setFundReason(e.target.value)}
                      placeholder="e.g., Referral bonus"
                    />
                  </div>
                  <button
                    onClick={onFundUser}
                    disabled={busy || !fundAmount}
                    className="btn btn-primary"
                  >
                    {busy ? 'Funding...' : 'Fund Account'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div className="admin-section">
          <h2>Withdrawal Requests</h2>
          {withdrawals.length > 0 ? (
            <div className="withdrawals-list">
              {withdrawals.map((w) => (
                <div key={`${w.uid}-${w.withdrawalId}`} className="withdrawal-item">
                  <div className="withdrawal-info">
                    <strong>{w.userName}</strong>
                    <small>{w.phoneNumber}</small>
                    <div className="amount">KES {w.amount.toLocaleString()}</div>
                    <div className="earning-type">Type: {w.earningType === 'task' ? '📋 Task' : '👥 Referral'}</div>
                    <div className="status">Status: {w.status}</div>
                    <small className="date">{new Date(w.requestedAt).toLocaleString()}</small>
                  </div>
                  <div className="withdrawal-actions">
                    {w.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onApproveWithdrawal(w.uid, w.withdrawalId)}
                          disabled={busy}
                          className="btn btn-success btn-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onRejectWithdrawal(w.uid, w.withdrawalId)}
                          disabled={busy}
                          className="btn btn-danger btn-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {w.status === 'approved' && (
                      <>
                        <button
                          onClick={() => onMarkPaid(w.uid, w.withdrawalId)}
                          disabled={busy}
                          className="btn btn-success btn-sm"
                        >
                          Mark as Paid
                        </button>
                        <button
                          onClick={() => onRejectWithdrawal(w.uid, w.withdrawalId)}
                          disabled={busy}
                          className="btn btn-danger btn-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {(w.status === 'paid' || w.status === 'rejected') && (
                      <span className="status-label">No actions available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No withdrawal requests</p>
          )}
        </div>
      )}
    </div>
  );
}
