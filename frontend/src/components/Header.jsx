import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/client';
import authApi from '../api/authApi';
import walletApi from '../api/walletApi';
import useAuthState from '../hooks/useAuthState';
import { clearRedirectPage } from '../utils/pagePersistence';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuthState();
  const [isPaid, setIsPaid] = useState(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (authLoading) {
      return () => {
        mounted = false;
      };
    }

    if (!user) {
      setIsPaid(false);
      setStatusChecked(true);
      return () => {
        mounted = false;
      };
    }

    setStatusChecked(false);

    (async () => {
      try {
        const token = await user.getIdToken();
        const resp = await authApi.getStatus(token);
        if (!mounted) return;
        setIsPaid(Boolean(resp?.isPaid));
        try {
          const w = await walletApi.getWallet(token);
          if (!mounted) return;
          setNotifications(w.user?.notifications || []);
        } catch (e) {
          // ignore notification fetch failure
        }
      } catch (err) {
        console.error('Header status fetch failed', err);
        if (!mounted) return;
        setIsPaid(null);
      } finally {
        if (!mounted) return;
        setStatusChecked(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [authLoading, user]);




  const handleLogout = () => {
    if (auth) {
      clearRedirectPage();
      auth.signOut().then(() => {
        navigate('/login', { replace: true });
      });
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">📊</span>
            <span className="logo-text">Outlier Auditor</span>
          </Link>

          <nav className="nav">
            {!user ? (
              <>
                <Link to="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`}>
                  Login
                </Link>
                <Link to="/register" className={`nav-link ${isActive('/register') ? 'active' : ''}`}>
                  Register
                </Link>
              </>
            ) : (
              <>
{!statusChecked ? (
              <span className="nav-loading">Checking account status...</span>
            ) : isPaid ? (
                  <>
                    <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                      Dashboard
                    </Link>
                    <Link to="/outlier-book" className={`nav-link ${isActive('/outlier-book') ? 'active' : ''}`}>
                      Outlier Book
                    </Link>
                  </>
                ) : (
                  <Link to="/payment" className={`nav-link ${isActive('/payment') ? 'active' : ''}`}>
                    Complete Payment
                  </Link>
                )}

                <div className="user-section">
                  <div className="user-email">{user.email}</div>
                  <div className="notif-wrap">
                    <button className="notif-btn" onClick={() => setShowNotifs(!showNotifs)} title="Notifications">
                      🔔{notifications?.length > 0 && <span className="notif-badge">{notifications.length}</span>}
                    </button>
                    {showNotifs && (
                      <div className="notif-dropdown">
                        {notifications.length === 0 ? (
                          <div className="notif-empty">No notifications</div>
                        ) : (
                          notifications.slice(0,5).map((n) => (
                            <div key={n.id} className="notif-item">
                              <div className="notif-msg">{n.message}</div>
                              <div className="notif-actions">
                                <button className="btn-sm" onClick={async () => {
                                  try {
                                    const token = await auth.currentUser.getIdToken();
                                    await walletApi.markNotificationRead(token, n.id);
                                    const w = await walletApi.getWallet(token);
                                    setNotifications(w.user?.notifications || []);
                                  } catch (e) { console.error(e); }
                                }}>Dismiss</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <Link to="/change-password" className="btn btn-secondary btn-sm">
                    Change Password
                  </Link>
                  <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
}
