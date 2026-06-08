import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Payment from './pages/Payment.jsx';
import Register from './pages/Register.jsx';
import PaymentStatus from './pages/PaymentStatus.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Task from './pages/Task.jsx';
import OutlierBook from './pages/OutlierBook.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/payment" element={<Payment />} />
      <Route path="/register" element={<Register />} />
      <Route path="/payment-status/:pendingId" element={<PaymentStatus />} />

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/task/:orderId" element={<Task />} />
      <Route path="/outlier-book" element={<OutlierBook />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
