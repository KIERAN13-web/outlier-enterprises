import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import useAuthState from '../hooks/useAuthState';

export default function PaidGate({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('checking');
  const { user, loading } = useAuthState();

  useEffect(() => {
    let mounted = true;

    if (loading) {
      return () => {
        mounted = false;
      };
    }

    if (!user) {
      navigate('/login', { replace: true });
      return () => {
        mounted = false;
      };
    }

    async function checkAccess() {
      try {
        const token = await user.getIdToken();
        const response = await authApi.getStatus(token);

        if (!mounted) return;

        if (!response?.isPaid) {
          navigate('/payment', { replace: true });
          return;
        }

        setStatus('ok');
      } catch (err) {
        if (!mounted) return;
        console.error('PaidGate error', err);
        navigate('/login', { replace: true });
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [loading, navigate, user, location.pathname]);

  if (status !== 'ok') {
    return (
      <div className="page-loading">
        <p>Checking payment access...</p>
      </div>
    );
  }

  return children;
}
