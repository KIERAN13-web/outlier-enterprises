import firebaseAdmin from '../services/firebaseAdmin.js';

async function syncUser(req, res) {
  try {
    const { uid, email } = req.user;

    const rdb = firebaseAdmin.database();
    const userRef = rdb.ref(`users/${uid}`);

    const now = new Date().toISOString();

    const snap = await userRef.get();
    if (!snap.exists()) {
      await userRef.set({
        email: email || null,
        isPaid: false,
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const updatedSnap = await userRef.get();
    const data = updatedSnap.exists() ? updatedSnap.val() : {};

    return res.json({
      ok: true,
      isPaid: Boolean(data?.isPaid),
      paidAt: data?.paidAt || null,
    });
  } catch (err) {
    console.error('syncUser error', err);
    return res.status(500).json({ ok: false, error: 'SYNC_FAILED' });
  }
}

async function getStatus(req, res) {
  try {
    const { uid } = req.user;

    const rdb = firebaseAdmin.database();
    const snap = await rdb.ref(`users/${uid}`).get();

    const data = snap.exists() ? snap.val() : null;
    return res.json({
      ok: true,
      isPaid: Boolean(data?.isPaid),
      paidAt: data?.paidAt || null,
    });
  } catch (err) {
    console.error('getStatus error', err);
    return res.status(500).json({ ok: false, error: 'STATUS_FAILED' });
  }
}

export default { syncUser, getStatus };

