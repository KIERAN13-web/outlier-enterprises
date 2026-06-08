import firebaseAdmin from '../services/firebaseAdmin.js';

async function adminRequired(req, res, next) {
  try {
    const adminToken = req.headers['x-admin-token'];

    if (!adminToken) {
      return res.status(401).json({ ok: false, error: 'admin_token_required' });
    }

    // Verify token (in production, use JWT verification)
    const validAdminKey = process.env.ADMIN_KEY || 'admin123';
    const expectedToken = Buffer.from(validAdminKey).toString('base64');

    if (adminToken !== expectedToken) {
      return res.status(401).json({ ok: false, error: 'invalid_admin_token' });
    }

    next();
  } catch (err) {
    console.error('adminRequired error', err);
    return res.status(500).json({ ok: false, error: 'ADMIN_AUTH_FAILED' });
  }
}

export default adminRequired;
