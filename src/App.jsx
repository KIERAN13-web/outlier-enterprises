import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Payment from './pages/Payment.jsx';
import Register from './pages/Register.jsx';
import PaymentStatus from './pages/PaymentStatus.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Task from './pages/Task.jsx';
import OutlierBook from './pages/OutlierBook.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminGate from './components/AdminGate.jsx';
import { saveCurrentPage } from './utils/pagePersistence';

export default function App() {
  const location = useLocation();

  // Save current page for restoration after login
  useEffect(() => {
    saveCurrentPage(location.pathname);
  }, [location.pathname]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payment-status/:pendingId" element={<PaymentStatus />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/task/:orderId" element={<Task />} />
        <Route path="/outlier-book" element={<OutlierBook />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminGate>
              <AdminDashboard />
            </AdminGate>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

