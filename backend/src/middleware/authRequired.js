import firebaseAdmin from '../services/firebaseAdmin.js';

export default async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'NO_AUTH' });
    }

    const token = header.slice('Bearer '.length);
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      isAdmin: Boolean(decoded.isAdmin),
    };
    req.decodedToken = decoded;

    next();
  } catch (err) {
    console.error('authRequired error', err);
    return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
  }
}

