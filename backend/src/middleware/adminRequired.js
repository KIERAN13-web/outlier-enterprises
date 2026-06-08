import firebaseAdmin from '../services/firebaseAdmin.js';

async function adminRequired(req, res, next) {
  try {
    // Get Firebase ID token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'token_required' });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token with Firebase
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is admin in database
    const rdb = firebaseAdmin.database();
    const userSnap = await rdb.ref(`users/${uid}`).get();

    if (!userSnap.exists()) {
      return res.status(403).json({ ok: false, error: 'user_not_found' });
    }

    const user = userSnap.val();
    if (!user.isAdmin) {
      return res.status(403).json({ ok: false, error: 'admin_access_denied' });
    }

    // Attach uid to request for use in controllers
    req.adminUid = uid;
    next();
  } catch (err) {
    console.error('adminRequired error', err);
    return res.status(401).json({ ok: false, error: 'ADMIN_AUTH_FAILED' });
  }
}

export default adminRequired;
