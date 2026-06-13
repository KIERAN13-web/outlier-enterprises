import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { validateStartupEnv } from './utils/env.js';
import authRoutes from './routes/auth.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import pesapalRoutes from './routes/pesapal.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import outlierRoutes from './routes/outlier.routes.js';
import taskRoutes from './routes/task.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import adminRoutes from './routes/admin.routes.js';
import firebaseAdmin from './services/firebaseAdmin.js';

dotenv.config();
validateStartupEnv();

const app = express();
app.set('trust proxy', true);

// Build allowed origins list from env. Support comma-separated list and
// tolerate values that include a path (e.g. https://host/path) by extracting
// the origin portion so comparisons match the browser `Origin` header.
const rawCors = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsEntries = rawCors
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  'https://pay.pesapal.com',     // Pesapal production
  'https://sandbox.pesapal.com', // Pesapal sandbox (for webhook/redirect callbacks)
];
const allowedOriginPatterns = [];
for (const entry of corsEntries) {
  if (entry.includes('*')) {
    const escaped = entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    allowedOriginPatterns.push(new RegExp(`^${escaped}$`));
    continue;
  }
  try {
    allowedOrigins.push(new URL(entry).origin);
  } catch {
    allowedOrigins.push(entry);
  }
}

// Debug endpoint to inspect incoming Origin header and allowedOrigins
app.get('/debug-cors', (req, res) => {
  try {
    const incomingOrigin = req.get('Origin') || null;
    return res.json({ ok: true, origin: incomingOrigin, allowedOrigins });
  } catch (e) {
    return res.json({ ok: false, error: 'DEBUG_FAILED', message: e.message });
  }
});

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests (curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) return callback(null, true);
      console.warn(`[CORS] blocked origin=${origin} allowed=${allowedOrigins.join(', ')} patterns=${allowedOriginPatterns.map((r) => r.source).join(', ')}`);
      return callback(new Error('CORS not allowed'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Temporary setup endpoint - SET UP ADMIN USERS
// Place after express.json() so req.body is available
app.post('/setup/make-admin', async (req, res) => {
  try {
    const setupSecret = process.env.SETUP_SECRET || 'dev-only-secret-change-me';
    const { email, secret } = req.body;

    if (!email || !secret || secret !== setupSecret) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    // Get user by email
    const user = await firebaseAdmin.auth().getUserByEmail(email);

    // Set custom claims
    await firebaseAdmin.auth().setCustomUserClaims(user.uid, { isAdmin: true });

    // Update database
    await firebaseAdmin.database().ref(`users/${user.uid}`).update({
      isAdmin: true,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[SETUP] Made ${email} an admin`);
    return res.json({ ok: true, message: `${email} is now an admin`, uid: user.uid });
  } catch (err) {
    console.error('[SETUP] Error:', err.message);
    return res.status(400).json({ ok: false, error: err.message });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ ok: true, environment: process.env.NODE_ENV || 'development' });
});

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments/pesapal', pesapalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/outliers', outlierRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'INTERNAL_SERVER_ERROR' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  const pesapalEnv = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
  const pesapalApiBase = pesapalEnv === 'production'
    ? 'https://pay.pesapal.com/v3/api'
    : 'https://cybjqa.pesapal.com/pesapalv3/api';
  console.log(`Pesapal mode: ${pesapalEnv}; API base: ${pesapalApiBase}`);
  console.log(`Pesapal callback URL: ${process.env.PESAPAL_CALLBACK_URL || 'not set (will default to runtime host)'}`);
  // Attempt to auto-register Pesapal IPN on startup if configuration is present and no IPN id is set
  (async () => {
    try {
      const hasKey = !!process.env.PESAPAL_CONSUMER_KEY || !!process.env.PESAPAL_KEY || !!process.env.PESAPAL_API_KEY;
      const hasSecret = !!process.env.PESAPAL_CONSUMER_SECRET || !!process.env.PESAPAL_SECRET || !!process.env.PESAPAL_API_SECRET;
      const callbackUrl = process.env.PESAPAL_CALLBACK_URL || null;
      const alreadySet = !!process.env.PESAPAL_IPN_ID;

      if (hasKey && hasSecret && callbackUrl && !alreadySet) {
        try {
          const registerUrl = `http://localhost:${port}/api/payments/pesapal/register-ipn`;
          console.log(`[Startup] Attempting to register Pesapal IPN at ${registerUrl} -> ${callbackUrl}`);
          const resp = await fetch(registerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: callbackUrl }),
          });
          const data = await resp.json().catch(() => null);
          console.log('[Startup] Pesapal IPN registration response:', resp.status, data || 'no-json');
        } catch (err) {
          console.warn('[Startup] Pesapal IPN registration failed:', err.message || err);
        }
      } else {
        if (!hasKey || !hasSecret) console.log('[Startup] Pesapal credentials not found; skipping IPN registration');
        else if (!callbackUrl) console.log('[Startup] PESAPAL_CALLBACK_URL not set; skipping IPN registration');
        else console.log('[Startup] PESAPAL_IPN_ID already set; skipping IPN registration');
      }
    } catch (e) {
      console.warn('[Startup] Pesapal IPN registration check failed', e?.message || e);
    }
  })();
});

