import { useEffect, useState } from 'react';
import { auth } from '../firebase/client';
import { getIdToken } from 'firebase/auth';
import dashboardApi from '../api/dashboardApi';
import AccountTable from '../components/AccountTable';
import EarningsCard from '../components/EarningsCard';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = async (token) => {
    try {
      const [accountsData, ordersData] = await Promise.all([
        dashboardApi.getAccountPool(token),
        dashboardApi.getOrders(token),
      ]);
      setAccounts(accountsData.accounts || []);
      setOrders(ordersData.orders || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load data');
      if (err.status === 403) navigate('/payment', { replace: true });
    }
  };

  useEffect(() => {
    (async () => {
      setBusy(true);
      setError('');
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login', { replace: true });
          return;
        }

        const token = await user.getIdToken();
        await fetchData(token);
      } finally {
        setBusy(false);
      }
    })();
  }, [navigate]);

  // Poll for order updates every 5 seconds to check for verification status changes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          await fetchData(token);
        }
      } catch (err) {
        console.error('Error polling for updates:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Manage your accounts and run outlier analysis</p>
        </div>
        <Link to="/outlier-book" className="btn btn-primary">
          📊 Create Outlier Book
        </Link>
      </div>

      {/* Earnings Card */}
      <EarningsCard />

      <div className="dashboard-stats">
        <div className="stat-card card">
          <div className="stat-value">{accounts.length}</div>
          <div className="stat-label">Accounts Available</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{orders.length}</div>
          <div className="stat-label">Orders</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">✓</div>
          <div className="stat-label">Account Active</div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content card">
        <div className="content-header">
          <h2>Your Accounts</h2>
          {busy && <span className="loading">Loading accounts...</span>}
        </div>

        {accounts.length > 0 || orders.length > 0 ? (
          <AccountTable accounts={accounts} orders={orders} />
        ) : (
          <div className="empty-state">
            <p>No accounts or orders yet</p>
            <small>Your accounts and orders will appear here</small>
          </div>
        )}
      </div>
    </div>
  );
}
