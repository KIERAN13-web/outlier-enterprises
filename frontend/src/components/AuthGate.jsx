import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/client';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase env vars are missing/misconfigured, `auth` can be null.
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (!auth) {
    return (
      <div className="config-error">
        <h2>Firebase is not configured</h2>
        <p>Set the required <code>VITE_FIREBASE_*</code> environment variables and redeploy.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-loading">
        <p>Verifying login status...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Token check is handled by backend paymentRequired middleware.
  // We just ensure user exists.
  return children;
}
