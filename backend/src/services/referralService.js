import crypto from 'crypto';

async function codeExists(rdb, code) {
  const snap = await rdb.ref('users').orderByChild('referralCode').equalTo(code).limitToFirst(1).get();
  return snap.exists();
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

async function creditReferralBonus(rdb, referralCode, referredEmail, bonus = 50) {
  if (!referralCode) return null;
  try {
    const refSnap = await rdb.ref('users').orderByChild('referralCode').equalTo(referralCode).limitToFirst(1).get();
    if (!refSnap.exists()) return null;

    const entries = Object.entries(refSnap.val());
    const [refUid, refUser] = entries[0];

    const walletRef = rdb.ref(`users/${refUid}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { taskBalance: 0, referralBalance: 0, totalEarnings: 0 };
    const newReferralBalance = (wallet.referralBalance || 0) + bonus;
    const newTotalEarnings = (wallet.totalEarnings || 0) + bonus;
    await walletRef.update({ referralBalance: newReferralBalance, totalEarnings: newTotalEarnings, updatedAt: new Date().toISOString() });

    const txRef = rdb.ref(`users/${refUid}/wallet/transactions`).push();
    await txRef.set({
      type: 'referral',
      amount: bonus,
      description: `Referral bonus for inviting ${referredEmail || 'a user'}`,
      status: 'credited',
      createdAt: new Date().toISOString(),
    });

    const notifRef = rdb.ref(`users/${refUid}/notifications`).push();
    const notifId = notifRef.key;
    await notifRef.set({
      id: notifId,
      type: 'referral',
      amount: bonus,
      message: `You've earned KES ${bonus} from a referral.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return { refUid, bonus };
  } catch (err) {
    console.error('creditReferralBonus error', err);
    return null;
  }
}

export default { generateUniqueReferralCode, creditReferralBonus };
