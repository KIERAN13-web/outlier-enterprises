import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/client';
import authApi from '../api/authApi';

export default function PaidGate({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

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
  }, [location.pathname, navigate]);

  if (status !== 'ok') {
    return (
      <div className="page-loading">
        <p>Checking payment access...</p>
      </div>
    );
  }

  return children;
}
