import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase/client';
import adminApi from '../api/adminApi';

export default function AdminGate({ children }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const idToken = await user.getIdToken();
        await adminApi.getDashboardStats(idToken);
        setIsAdmin(true);
      } catch (err) {
        console.error('Admin verification failed:', err);
        navigate('/dashboard', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, auth]);

  if (isAdmin === null) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return children;
}

