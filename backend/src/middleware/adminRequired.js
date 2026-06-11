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
    const tokenIsAdmin = Boolean(decodedToken.isAdmin);

    // Check if user is admin in database, but allow admin claims when DB flags are missing
    const rdb = firebaseAdmin.database();
    const userRef = rdb.ref(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists()) {
      if (!tokenIsAdmin) {
        return res.status(403).json({ ok: false, error: 'user_not_found' });
      }

      const now = new Date().toISOString();
      await userRef.set({
        email: decodedToken.email || null,
        isAdmin: true,
        isPaid: false,
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      });
      req.adminUid = uid;
      return next();
    }

    const user = userSnap.val();
    if (!user.isAdmin) {
      if (!tokenIsAdmin) {
        return res.status(403).json({ ok: false, error: 'admin_access_denied' });
      }

      await userRef.update({ isAdmin: true, updatedAt: new Date().toISOString() });
    }

    // Attach uid to request for use in controllers
    req.adminUid = uid;
    next();
  } catch (err) {
    console.error('adminRequired error', err);
    return res.status(401).json({ ok: false, error: 'ADMIN_AUTH_FAILED', message: err.message });
  }
}

export default adminRequired;
