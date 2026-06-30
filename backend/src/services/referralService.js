import crypto from 'crypto';

async function codeExists(rdb, code) {
  const snap = await rdb.ref('users').orderByChild('referralCode').equalTo(code).limitToFirst(1).get();
  return snap.exists();
}

async function findUserByReferralCode(rdb, code) {
  if (!code) return null;
  const snap = await rdb.ref('users').orderByChild('referralCode').equalTo(code).limitToFirst(1).get();
  if (!snap.exists()) return null;
  const entries = Object.entries(snap.val());
  const [uid, user] = entries[0];
  return { uid, user };
}

function generateCandidate(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // avoid ambiguous chars
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function generateUniqueReferralCode(rdb, length = 6, maxAttempts = 8) {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateCandidate(length);
    try {
      const exists = await codeExists(rdb, candidate);
      if (!exists) return candidate;
    } catch (e) {
      // if db query fails, fall back to another candidate
    }
  }
  // fallback: use short hash
  return `R${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function getReferralStats(rdb, referralCode) {
  if (!referralCode) return { totalReferred: 0, pendingReferred: 0, activeReferred: 0, maxReferralWithdrawal: 0 };

  try {
    const snap = await rdb.ref('users').get();
    const users = snap.exists() ? snap.val() : {};

    let totalReferred = 0;
    let pendingReferred = 0;
    let activeReferred = 0;

    for (const [, user] of Object.entries(users || {})) {
      const userReferralCode = user?.referredByCode || user?.referrerCode;
      if (userReferralCode && String(userReferralCode) === String(referralCode)) {
        totalReferred += 1;
        if (Boolean(user?.isPaid)) {
          activeReferred += 1;
        } else {
          pendingReferred += 1;
        }
      }
    }

    const pendingSnap = await rdb.ref('pendingUsers').get();
    const pendingUsers = pendingSnap.exists() ? pendingSnap.val() : {};
    let pendingFromPendingUsers = 0;
    for (const pendingEntry of Object.values(pendingUsers || {})) {
      if (
        pendingEntry &&
        String(pendingEntry.referralCode || '') === String(referralCode) &&
        String(pendingEntry.status || '').toUpperCase() === 'PENDING'
      ) {
        pendingFromPendingUsers += 1;
      }
    }

    totalReferred += pendingFromPendingUsers;
    pendingReferred += pendingFromPendingUsers;

    return {
      totalReferred,
      pendingReferred,
      activeReferred,
      maxReferralWithdrawal: activeReferred * 50,
    };
  } catch (err) {
    console.error('getReferralStats error', err);
    return { totalReferred: 0, pendingReferred: 0, activeReferred: 0, maxReferralWithdrawal: 0 };
  }
}

async function creditReferralBonus(rdb, referralCode, referredEmail, bonus = undefined) {
  if (!referralCode) {
    console.warn('creditReferralBonus skipped: missing referralCode');
    return null;
  }
  const configured = Number(process.env.REFERRAL_BONUS) || 50;
  const reward = typeof bonus === 'number' ? bonus : configured;

  try {
    const refSnap = await rdb.ref('users').orderByChild('referralCode').equalTo(referralCode).limitToFirst(1).get();
    if (!refSnap.exists()) {
      console.warn(`creditReferralBonus skipped: no referrer found for code ${referralCode}`);
      return null;
    }

    const entries = Object.entries(refSnap.val());
    const [refUid, refUser] = entries[0];

    // Prevent self-referral
    if (refUser?.email && referredEmail && refUser.email === referredEmail) {
      console.warn(`creditReferralBonus skipped: self-referral prevented for ${referredEmail}`);
      return null;
    }

    // Check if this referredEmail was already used to credit this referrer
    const txSnap = await rdb.ref(`users/${refUid}/wallet/transactions`).get();
    const txs = txSnap.exists() ? txSnap.val() : {};
    for (const t of Object.values(txs || {})) {
      if (t?.type === 'referral' && referredEmail && String(t.description || '').includes(referredEmail)) {
        console.warn(`creditReferralBonus skipped: duplicate referral credit for ${referredEmail}`);
        return null;
      }
    }

    const walletRef = rdb.ref(`users/${refUid}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { taskBalance: 0, referralBalance: 0, totalEarnings: 0 };
    const newReferralBalance = (wallet.referralBalance || 0) + reward;
    const newTotalEarnings = (wallet.totalEarnings || 0) + reward;
    await walletRef.update({ referralBalance: newReferralBalance, totalEarnings: newTotalEarnings, updatedAt: new Date().toISOString() });

    const txRef = rdb.ref(`users/${refUid}/wallet/transactions`).push();
    await txRef.set({
      type: 'referral',
      amount: reward,
      description: `Referral bonus for inviting ${referredEmail || 'a user'}`,
      status: 'credited',
      createdAt: new Date().toISOString(),
    });

    const notifRef = rdb.ref(`users/${refUid}/notifications`).push();
    const notifId = notifRef.key;
    await notifRef.set({
      id: notifId,
      type: 'referral',
      amount: reward,
      message: `You've earned KES ${reward} from a referral.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return { refUid, bonus: reward };
  } catch (err) {
    console.error('creditReferralBonus error', err);
    return null;
  }
}

export default { generateUniqueReferralCode, creditReferralBonus, findUserByReferralCode, getReferralStats };
