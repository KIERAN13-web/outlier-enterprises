import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase/client';

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
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Call admin API to verify admin status (this will also check isAdmin field)
        const response = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (response.ok) {
          setIsAdmin(true);
        } else {
          // User is not admin
          navigate('/dashboard', { replace: true });
        }
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

