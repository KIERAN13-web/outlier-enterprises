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

dotenv.config();
validateStartupEnv();

const app = express();

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

