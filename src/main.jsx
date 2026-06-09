import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Inject runtime CSS override to ensure footer/layout updates apply after build
try {
  const _s = document.createElement('style')
  _s.innerHTML = '.footer{padding:1.75rem 0 !important}.footer-grid{gap:1.5rem !important}.footer-bottom{gap:1rem !important}';
  document.head.appendChild(_s)
} catch (e) {
  // ignore
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

