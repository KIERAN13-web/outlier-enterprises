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
      
      const newAccounts = accountsData.accounts || [];
      const newOrders = ordersData.orders || [];

      // Only update if data changed to prevent unnecessary re-renders
      setAccounts(prev => JSON.stringify(prev) === JSON.stringify(newAccounts) ? prev : newAccounts);
      setOrders(prev => JSON.stringify(prev) === JSON.stringify(newOrders) ? prev : newOrders);
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

  // Poll for order updates only when tab is visible
  useEffect(() => {
    let interval;
    
    const startPolling = () => {
      interval = setInterval(async () => {
        if (document.hidden) return; // Don't fetch if tab is backgrounded
        
        try {
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            await fetchData(token);
          }
        } catch (err) {
          console.error('Error polling for updates:', err);
        }
      }, 8000); // Increased interval to 8s for better balance
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="dashboard-container container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Enterprise audit environment initialized</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/outlier-book" className="btn btn-primary btn-lg">
            <i className="ti ti-book"></i> Create Outlier Book
          </Link>
        </div>
      </div>

      {/* Earnings Card */}
      <EarningsCard />

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Accounts in Pool</div>
          <div className="stat-value">{accounts.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Orders</div>
          <div className="stat-value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Verification Status</div>
          <div className="stat-value text-accent"><i className="ti ti-shield-check"></i></div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content card">
        <div className="content-header">
          <h2>Monitored Accounts</h2>
          {busy && <span className="loading">Syncing secure data...</span>}
        </div>

        {accounts.length > 0 || orders.length > 0 ? (
          <div className="table-container">
            <AccountTable accounts={accounts} orders={orders} />
          </div>
        ) : (
          <div className="empty-state">
            <i className="ti ti-database-off"></i>
            <p>No telemetry data available</p>
            <small>Initialize your first account pool to begin auditing</small>
          </div>
        )}
      </div>
    </div>
  );
}
