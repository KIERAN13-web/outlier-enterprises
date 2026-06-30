import referralService from '../services/referralService.js';

function normalizePaymentStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (!normalized) return 'PENDING';
  if (['COMPLETED', 'PAID', 'SUCCESS', 'CONFIRMED'].includes(normalized)) return 'COMPLETED';
  if (['FAILED', 'DECLINED', 'CANCELLED', 'REJECTED', 'ERROR'].includes(normalized)) return 'FAILED';
  return 'PENDING';
}

function shouldAutoActivateRegistration(payload = {}) {
  if (payload.force) return true;
  const paymentStatus = normalizePaymentStatus(payload.paymentStatus || payload.status);
  return paymentStatus === 'COMPLETED';
}

async function activatePendingRegistration({
  rdb,
  pendingId,
  pendingData,
  now = new Date().toISOString(),
  cleanupPendingApproval,
}) {
  if (!rdb) {
    throw new Error('database_required');
  }

  const { default: firebaseAdmin } = await import('../services/firebaseAdmin.js');
  const data = pendingData || {};
  const email = data.email;
  if (!email) {
    throw new Error('pending_user_missing_email');
  }

  let uid;

  try {
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password: data.password || `Manual${Date.now()}!`,
      displayName: data.name || null,
    });
    uid = userRecord.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      try {
        const existing = await firebaseAdmin.auth().getUserByEmail(email);
        uid = existing.uid;
      } catch (lookupErr) {
        console.error('[activatePendingRegistration] failed to lookup existing email after duplicate create error', lookupErr?.stack || lookupErr);
        throw new Error('existing_user_lookup_failed');
      }

      if (data.password) {
        try {
          await firebaseAdmin.auth().updateUser(uid, { password: data.password });
        } catch (pwErr) {
          console.error('[activatePendingRegistration] failed to update password', pwErr?.stack || pwErr);
        }
      }
    } else {
      console.error('[activatePendingRegistration] createUser error', err?.stack || err);
      throw err;
    }
  }

  const userRef = rdb.ref(`users/${uid}`);
  const existingUserSnap = await userRef.get();
  const existingUser = existingUserSnap.exists() ? existingUserSnap.val() : {};

  const referrerCode = data.referralCode || null;
  let referralCodeForNewUser = existingUser.referralCode;
  if (!referralCodeForNewUser) {
    try {
      referralCodeForNewUser = await referralService.generateUniqueReferralCode(rdb);
    } catch (err) {
      referralCodeForNewUser = `R${(uid || '').slice(0, 8)}`;
    }
  }

  const updates = {
    email,
    fullName: data.name || existingUser.fullName || null,
    country: data.country || existingUser.country || null,
    idNumber: data.idNumber || existingUser.idNumber || null,
    phoneNumber: data.phoneNumber || existingUser.phoneNumber || null,
    isPaid: true,
    paidAt: now,
    referralCode: referralCodeForNewUser,
    referredByCode: referrerCode || existingUser.referredByCode || null,
    updatedAt: now,
  };

  if (!existingUser.createdAt) updates.createdAt = now;
  if (existingUser.isAdmin === undefined) updates.isAdmin = false;

  await userRef.update(updates);

  const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
  if (!walletSnap.exists()) {
    await rdb.ref(`users/${uid}/wallet`).set({
      taskBalance: 0,
      referralBalance: 0,
      totalEarnings: 0,
      updatedAt: now,
    });
  }

  if (referrerCode) {
    try {
      await referralService.creditReferralBonus(rdb, referrerCode, email);
    } catch (err) {
      console.error('[activatePendingRegistration] referral credit failed', err);
    }
  }

  await Promise.all([
    rdb.ref(`pendingPayments/${pendingId}`).update({
      status: 'COMPLETED',
      paymentStatus: 'COMPLETED',
      paymentCompletedAt: now,
      updatedAt: now,
    }).catch(() => {}), // Ignore if pendingPayments record doesn't exist
    rdb.ref(`pendingUsers/${pendingId}`).update({
      status: 'COMPLETED',
      paymentStatus: 'COMPLETED',
      paymentCompletedAt: now,
      uid,
      isPaid: true,
      paidAt: now,
      updatedAt: now,
    }),
  ]);

  if (cleanupPendingApproval) {
    await cleanupPendingApproval(pendingId);
  }

  return { status: 'COMPLETED', uid };
}

export { normalizePaymentStatus, shouldAutoActivateRegistration, activatePendingRegistration };
