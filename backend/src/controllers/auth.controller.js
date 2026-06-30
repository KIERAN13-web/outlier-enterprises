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
      updates.isAdmin = req.user?.isAdmin === true;
      try {
        const { default: referralService } = await import('../services/referralService.js');
        updates.referralCode = await referralService.generateUniqueReferralCode(rdb);
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
      const tokenIsAdmin = Boolean(req.user?.isAdmin);
      if (existing.isAdmin === undefined) {
        updates.isAdmin = tokenIsAdmin;
      } else if (tokenIsAdmin && !existing.isAdmin) {
        updates.isAdmin = true;
      }
      // Generate referral code if missing
      if (!existing.referralCode) {
        try {
          const { default: referralService } = await import('../services/referralService.js');
          updates.referralCode = await referralService.generateUniqueReferralCode(rdb);
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

    try {
      // Always sync custom claims to match current DB value
      await firebaseAdmin.auth().setCustomUserClaims(uid, {
        isAdmin: Boolean(data?.isAdmin),
      });
      console.log(`[syncUser] Set custom claims for ${uid}: isAdmin=${Boolean(data?.isAdmin)}`);
    } catch (claimError) {
      console.warn('Unable to set admin custom claim during sync:', claimError);
    }

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

async function changePassword(req, res) {
  try {
    const { uid } = req.user;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ 
        ok: false, 
        error: 'PASSWORD_TOO_SHORT',
        message: 'Password must be at least 6 characters'
      });
    }

    // Update the password using Firebase Admin SDK
    await firebaseAdmin.auth().updateUser(uid, { password: newPassword });

    return res.json({
      ok: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('changePassword error', err);
    if (err.code === 'auth/invalid-password') {
      return res.status(400).json({ 
        ok: false, 
        error: 'INVALID_PASSWORD',
        message: 'Password is invalid or does not meet security requirements'
      });
    }
    return res.status(500).json({ 
      ok: false, 
      error: 'PASSWORD_CHANGE_FAILED',
      message: err.message || 'Failed to change password'
    });
  }
}

export default { syncUser, getStatus, changePassword };

