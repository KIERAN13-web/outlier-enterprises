import Footer from './Footer';
import { Outlet } from 'react-router-dom';
import './Layout.css';

export default function DashboardLayout() {
  return (
    <div className="layout">
      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
