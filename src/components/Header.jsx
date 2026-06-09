import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/client';
import authApi from '../api/authApi';
import walletApi from '../api/walletApi';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(auth?.currentUser || null);
  const [isPaid, setIsPaid] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const resp = await authApi.getStatus(token);
        setIsPaid(Boolean(resp?.isPaid));
        // fetch notifications via wallet API
        try {
          const w = await walletApi.getWallet(token);
          setNotifications(w.user?.notifications || []);
        } catch (e) {
          // ignore
        }
      } catch {
        setIsPaid(null);
      }
    })();
  }, [user]);

  const handleLogout = () => {
    if (auth) {
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
                <Link to="/admin-register" className={`nav-link ${isActive('/admin-register') ? 'active' : ''}`}>
                  Admin Registration
                </Link>
              </>
            ) : (
              <>
                {isPaid ? (
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
