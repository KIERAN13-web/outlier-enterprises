import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthState from '../hooks/useAuthState';
import { getAdminStatus } from '../utils/adminAuth';

export default function AdminGate({ children }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const [error, setError] = useState(null);
  const { user, loading } = useAuthState();

  useEffect(() => {
    let isMounted = true;

    if (loading) {
      return () => {
        isMounted = false;
      };
    }

    const verifyAdmin = async () => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const adminStatus = await getAdminStatus(user);
        if (!isMounted) return;

        if (adminStatus) {
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
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [loading, navigate, user]);

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

