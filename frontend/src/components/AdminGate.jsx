import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AdminGate({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) {
    return null;
  }

  return children;
}
