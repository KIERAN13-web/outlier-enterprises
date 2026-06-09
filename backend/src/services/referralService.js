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

async function creditReferralBonus(rdb, referralCode, referredEmail, bonus = undefined) {
  if (!referralCode) return null;
  const configured = Number(process.env.REFERRAL_BONUS) || 50;
  const dailyLimit = Number(process.env.REFERRAL_DAILY_LIMIT) || 100;
  const reward = typeof bonus === 'number' ? bonus : configured;

  try {
    const refSnap = await rdb.ref('users').orderByChild('referralCode').equalTo(referralCode).limitToFirst(1).get();
    if (!refSnap.exists()) return null;

    const entries = Object.entries(refSnap.val());
    const [refUid, refUser] = entries[0];

    // Prevent self-referral
    if (refUser?.email && referredEmail && refUser.email === referredEmail) return null;

    // Check if this referredEmail was already used to credit this referrer
    const txSnap = await rdb.ref(`users/${refUid}/wallet/transactions`).get();
    const txs = txSnap.exists() ? txSnap.val() : {};
    for (const t of Object.values(txs || {})) {
      if (t?.type === 'referral' && referredEmail && String(t.description || '').includes(referredEmail)) {
        // already credited for this referred email
        return null;
      }
    }

    // Rate-limit: count referral txs in last 24 hours
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    let recentCount = 0;
    for (const t of Object.values(txs || {})) {
      if (t?.type === 'referral' && t.createdAt) {
        const tTime = new Date(t.createdAt).getTime();
        if (tTime >= dayAgo) recentCount++;
      }
    }
    if (recentCount >= dailyLimit) {
      // optionally record a notification about limit reached
      const notifRef = rdb.ref(`users/${refUid}/notifications`).push();
      const notifId = notifRef.key;
      await notifRef.set({ id: notifId, type: 'referral_limit', message: `Referral credit limit reached for today.`, read: false, createdAt: new Date().toISOString() });
      return null;
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

export default { generateUniqueReferralCode, creditReferralBonus };
