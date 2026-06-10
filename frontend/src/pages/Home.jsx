import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/client';
import authApi from '../api/authApi';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth) return;

    const getAdminStatus = async (token) => {
      try {
        const syncResult = await authApi.syncUser(token);
        if (typeof syncResult?.isAdmin === 'boolean') {
          return syncResult.isAdmin;
        }
      } catch {
        // ignore sync failure
      }

      try {
        const statusResult = await authApi.getStatus(token);
        return Boolean(statusResult?.isAdmin);
      } catch {
        return false;
      }
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        const isAdmin = await getAdminStatus(token);
        navigate(isAdmin ? '/admin/dashboard' : '/dashboard', { replace: true });
      }
    });

    return () => unsub();
  }, [navigate]);

  const features = [
    {
      icon: 'ti-search',
      title: 'Detect Outliers',
      description: 'Advanced algorithms to identify unusual patterns and anomalies in your financial data.',
    },
    {
      icon: 'ti-chart-dots',
      title: 'Visualize Data',
      description: 'Beautiful charts and graphs to understand your data at a glance.',
    },
    {
      icon: 'ti-zap',
      title: 'Real-time Analysis',
      description: 'Get instant insights with our powerful real-time processing engine.',
    },
    {
      icon: 'ti-shield-check',
      title: 'Secure & Private',
      description: 'Enterprise-grade security ensures your data stays safe and private.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Create Account',
      description: 'Sign up with your email and password in seconds.',
    },
    {
      number: '02',
      title: 'Make Payment',
      description: 'Pay 200 KES via M-Pesa to unlock full access.',
    },
    {
      number: '03',
      title: 'Upload Data',
      description: 'Import your account data securely to our platform.',
    },
    {
      number: '04',
      title: 'Get Analysis',
      description: 'Receive detailed outlier reports and insights.',
    },
  ];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero container">
        <div className="hero-content">
          <div className="hero-tagline">Elite Financial Intelligence</div>
          <h1 className="hero-title">Precision Outlier <span className="text-accent">Detection</span></h1>
          <p className="hero-subtitle">
            Uncover the unburnished truth in your financial accounts. Our enterprise-grade engine identifies anomalies and patterns with 99.9% accuracy.
          </p>
          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary btn-centered">
              Get Started <i className="ti ti-chevron-right"></i>
            </Link>
            <a href="#features" className="btn btn-outline btn-centered">
              The Technology
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats container">
        <div className="stat-card">
          <span className="stat-number">10K+</span>
          <span className="stat-label">Active Deployments</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">500M+</span>
          <span className="stat-label">Transactions Audited</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">24/7</span>
          <span className="stat-label">Real-time Monitoring</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">99.9%</span>
          <span className="stat-label">System Uptime</span>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features container">
        <div className="section-header">
          <p className="section-subtitle">Core Capabilities</p>
          <h2 className="section-title">Engineered for Scale</h2>
        </div>
        <div className="features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="feature-card card">
              <div className="feature-icon"><i className={`ti ${feature.icon}`}></i></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works container">
        <div className="section-header">
          <p className="section-subtitle">Integration Path</p>
          <h2 className="section-title">Seamless Onboarding</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step, idx) => (
            <div key={idx} className="step-card">
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta container">
        <div className="cta-content">
          <h2>Deploy to Your Workflow</h2>
          <p>Experience the next generation of financial auditing. Start your analysis today.</p>
          <div className="cta-buttons">
            <Link to="/login" className="btn btn-primary">
              Initialize Account
            </Link>
            <Link to="/payment" className="btn btn-outline">
              Pricing Structure
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
