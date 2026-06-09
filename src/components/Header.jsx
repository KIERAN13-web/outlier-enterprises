import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/client';
import authApi from '../api/authApi';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth?.currentUser;
  const [isPaid, setIsPaid] = useState(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const resp = await authApi.getStatus(token);
        setIsPaid(Boolean(resp?.isPaid));
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
                  <span className="user-email">{user.email}</span>
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
