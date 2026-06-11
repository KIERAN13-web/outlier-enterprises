import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section">
            <h3>About Us</h3>
            <p>
              Outlier Auditor is a modern platform for detecting and analyzing financial outliers in your account data with ease and precision.
            </p>
          </div>

          <div className="footer-section">
            <h3>Product</h3>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#api">API Docs</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>Company</h3>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>Legal</h3>
            <ul>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#cookies">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-left">
            <div className="footer-copyright">
              <p>&copy; {currentYear} Outlier Auditor. All rights reserved.</p>
            </div>
          </div>

          <div className="footer-center">
            <div className="footer-social">
              <a href="#twitter" className="social-link" title="Twitter">𝕏</a>
              <a href="#github" className="social-link" title="GitHub">⚙️</a>
              <a href="#linkedin" className="social-link" title="LinkedIn">💼</a>
            </div>
          </div>

          <div className="footer-right">
            <a href="mailto:outlierenterprises77@gmail.com" className="contact-email">✉️ outlierenterprises77@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
