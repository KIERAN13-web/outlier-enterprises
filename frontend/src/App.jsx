import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AdminGate from './components/AdminGate.jsx';
import PaidGate from './components/PaidGate.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Payment = lazy(() => import('./pages/Payment.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const PaymentStatus = lazy(() => import('./pages/PaymentStatus.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Task = lazy(() => import('./pages/Task.jsx'));
const OutlierBook = lazy(() => import('./pages/OutlierBook.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="page-loading">Loading...</div>}>
      <Routes>
        {/* Admin dashboard route (no layout) */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminGate>
              <AdminDashboard />
            </AdminGate>
          }
        />
      </Routes>

      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/register" element={<Register />} />
          <Route path="/payment-status/:pendingId" element={<PaymentStatus />} />

          <Route path="/dashboard" element={
            <PaidGate>
              <Dashboard />
            </PaidGate>
          } />
          <Route path="/task/:orderId" element={
            <PaidGate>
              <Task />
            </PaidGate>
          } />
          <Route path="/outlier-book" element={
            <PaidGate>
              <OutlierBook />
            </PaidGate>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Suspense>
  );
}
