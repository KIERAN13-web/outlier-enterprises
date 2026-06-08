import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const features = [
    {
      icon: '🔍',
      title: 'Detect Outliers',
      description: 'Advanced algorithms to identify unusual patterns and anomalies in your financial data.',
    },
    {
      icon: '📊',
      title: 'Visualize Data',
      description: 'Beautiful charts and graphs to understand your data at a glance.',
    },
    {
      icon: '⚡',
      title: 'Real-time Analysis',
      description: 'Get instant insights with our powerful real-time processing engine.',
    },
    {
      icon: '🔒',
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
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Detect Financial Outliers Instantly</h1>
          <p className="hero-subtitle">
            Powerful outlier detection for your financial accounts. Identify anomalies, understand patterns, and make data-driven decisions.
          </p>
          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary">
              Get Started
            </Link>
            <a href="#features" className="btn btn-outline">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stat-card">
          <div className="stat-number">10K+</div>
          <div className="stat-label">Users Served</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">500M+</div>
          <div className="stat-label">Transactions Analyzed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">99.9%</div>
          <div className="stat-label">Uptime</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">24/7</div>
          <div className="stat-label">Support</div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 className="section-title">Powerful Features</h2>
        <p className="section-subtitle">Everything you need to analyze your financial data</p>
        <div className="features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="feature-card card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Get started in just 4 easy steps</p>
        <div className="steps-grid">
          {steps.map((step, idx) => (
            <div key={idx} className="step-card card">
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              {idx < steps.length - 1 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of users analyzing their financial data with Outlier Auditor.</p>
          <div className="cta-buttons">
            <Link to="/login" className="btn btn-primary btn-lg">
              Start Free Trial
            </Link>
            <Link to="/payment" className="btn btn-secondary btn-lg">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

