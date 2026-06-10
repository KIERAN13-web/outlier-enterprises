import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { validateStartupEnv } from './utils/env.js';
import authRoutes from './routes/auth.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import outlierRoutes from './routes/outlier.routes.js';
import taskRoutes from './routes/task.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import adminRoutes from './routes/admin.routes.js';
import firebaseAdmin from './services/firebaseAdmin.js';

dotenv.config();
validateStartupEnv();

const app = express();

// Debug endpoint to inspect incoming Origin header and allowedOrigins
// Place before CORS middleware so it can be reached even when CORS blocks later
app.get('/debug-cors', (req, res) => {
  try {
    const incomingOrigin = req.get('Origin') || null;
    return res.json({ ok: true, origin: incomingOrigin, allowedOrigins });
  } catch (e) {
    return res.json({ ok: false, error: 'DEBUG_FAILED', message: e.message });
  }
});

// Temporary setup endpoint - SET UP ADMIN USERS
// Protect with a simple secret from env var
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

// Build allowed origins list from env. Support comma-separated list and
// tolerate values that include a path (e.g. https://host/path) by extracting
// the origin portion so comparisons match the browser `Origin` header.
const rawCors = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawCors
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(v => {
    try {
      return new URL(v).origin;
    } catch {
      return v;
    }
  });

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests (curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ ok: true, environment: process.env.NODE_ENV || 'development' });
});

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
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
});

