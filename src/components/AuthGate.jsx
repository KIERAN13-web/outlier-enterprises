import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/client';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    // If Firebase env vars are missing/misconfigured, `auth` can be null.
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (!auth) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Firebase is not configured</h2>
        <p>Set the required <code>VITE_FIREBASE_*</code> environment variables and redeploy.</p>
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div style={{ padding: 24 }}>
        <p>Checking session...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Token check is handled by backend paymentRequired middleware.
  // We just ensure user exists.
  return children;
}

