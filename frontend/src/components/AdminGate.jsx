import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase/client';
import authApi from '../api/authApi';

export default function AdminGate({ children }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const [error, setError] = useState(null);
  const auth = getAuth(app);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return;

      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const statusResult = await authApi.getStatus(idToken);
        if (!isMounted) return;

        if (statusResult?.isAdmin) {
          setIsAdmin(true);
        } else {
          setError('not_admin');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Admin verification failed:', err);
        setError('verification_failed');
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate, auth]);

  if (error) {
    return null; // Will redirect via navigate above
  }

  if (isAdmin === null) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect via navigate above
  }

  return children;
}

