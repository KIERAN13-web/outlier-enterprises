import firebaseAdmin from '../services/firebaseAdmin.js';
import referralService from '../services/referralService.js';

async function syncUser(req, res) {
  try {
    const { uid, email } = req.user;

    const rdb = firebaseAdmin.database();
    const userRef = rdb.ref(`users/${uid}`);

    const now = new Date().toISOString();

    const snap = await userRef.get();
    const updates = {};

    if (!snap.exists()) {
      updates.email = email || null;
      updates.isPaid = false;
      updates.paidAt = null;
      updates.createdAt = now;
      updates.updatedAt = now;
      updates.isAdmin = false;
      try {
        updates.referralCode = await referralService.generateUniqueReferralCode(firebaseAdmin.database());
      } catch (e) {
        updates.referralCode = `R${uid.slice(0, 8)}`;
      }
    } else {
      const existing = snap.val();
      if (existing.email !== email) {
        updates.email = email || existing.email || null;
      }
      if (existing.isPaid === undefined) {
        updates.isPaid = false;
      }
      if (existing.paidAt === undefined) {
        updates.paidAt = null;
      }
      if (!existing.createdAt) {
        updates.createdAt = now;
      }
      if (existing.isAdmin === undefined) {
        updates.isAdmin = false;
      }
      // Generate referral code if missing
      if (!existing.referralCode) {
        try {
          updates.referralCode = await referralService.generateUniqueReferralCode(firebaseAdmin.database());
        } catch (e) {
          updates.referralCode = `R${uid.slice(0, 8)}`;
        }
      }
      updates.updatedAt = now;
    }

    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
    }

    const updatedSnap = await userRef.get();
    const data = updatedSnap.exists() ? updatedSnap.val() : {};

    return res.json({
      ok: true,
      isPaid: Boolean(data?.isPaid),
      paidAt: data?.paidAt || null,
      isAdmin: Boolean(data?.isAdmin),
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
      isAdmin: Boolean(data?.isAdmin),
    });
  } catch (err) {
    console.error('getStatus error', err);
    return res.status(500).json({ ok: false, error: 'STATUS_FAILED' });
  }
}

export default { syncUser, getStatus };

