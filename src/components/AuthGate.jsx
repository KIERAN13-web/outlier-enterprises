import { useEffect, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/client';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  // Token check is handled by backend paymentRequired middleware.
  // We just ensure user exists.
  return children;
}

