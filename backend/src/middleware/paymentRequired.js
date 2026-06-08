import firebaseAdmin from '../services/firebaseAdmin.js';

export default async function paymentRequired(req, res, next) {
  try {
    const { uid } = req.user;
    const rdb = firebaseAdmin.database();
    const snap = await rdb.ref(`users/${uid}`).get();

    const data = snap.exists() ? snap.val() : null;

    // Admin users should not be blocked by payment requirements.
    if (data?.isAdmin) {
      return next();
    }

    const isPaid = Boolean(data?.isPaid);
    if (!isPaid) {
      return res.status(403).json({ ok: false, error: 'PAYMENT_REQUIRED' });
    }

    next();
  } catch (err) {
    console.error('paymentRequired error', err);
    return res.status(500).json({ ok: false, error: 'PAYMENT_CHECK_FAILED' });
  }
}

