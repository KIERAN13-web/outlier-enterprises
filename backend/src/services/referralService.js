import crypto from 'crypto';
import { getCurrencyCodeForCountry, getReferralBonusForCountry } from '../utils/countryAmounts.js';

function normalizeReferralCode(code) {
  return String(code || '').trim().toUpperCase();
}

async function codeExists(rdb, code) {
  const normalized = normalizeReferralCode(code);
  const snap = await rdb.ref('users').orderByChild('referralCode').equalTo(normalized).limitToFirst(1).get();
  return snap.exists();
}

async function findUserByReferralCode(rdb, code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const snap = await rdb.ref('users').orderByChild('referralCode').equalTo(normalized).limitToFirst(1).get();
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
    } catch {
      // ignore and try again
    }
  }
  // fallback: use short hash/random
  return `R${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function getReferrerBonusKES(rdb, referralCode) {
  const normalized = normalizeReferralCode(referralCode);
  if (!normalized) return 0;

  const refSnap = await rdb
    .ref('users')
    .orderByChild('referralCode')
    .equalTo(normalized)
    .limitToFirst(1)
    .get();

  if (!refSnap.exists()) {
    // keep behavior safe; caller will likely skip crediting
    return 0;
  }

  const entries = Object.entries(refSnap.val() || {});
  const [, refUser] = entries[0];

  const country = refUser?.country || 'Kenya';
  return getReferralBonusForCountry(country).amount;
}

async function getReferralStats(rdb, referralCode, activeReferralsAtLastWithdrawal = 0) {
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  if (!normalizedReferralCode) {
    return { totalReferred: 0, pendingReferred: 0, activeReferred: 0, newActiveReferrals: 0, maxReferralWithdrawal: 0 };
  }

  try {
    // Find referrer's country to compute max withdrawal based on that country's referral bonus
    const bonusKESForReferrer = await getReferrerBonusKES(rdb, normalizedReferralCode);

    const snap = await rdb.ref('users').get();
    const users = snap.exists() ? snap.val() : {};

    let totalReferred = 0;
    let pendingReferred = 0;
    let activeReferred = 0;

    for (const [, user] of Object.entries(users || {})) {
      const userReferralCode = user?.referredByCode || user?.referrerCode;
      if (userReferralCode && normalizeReferralCode(userReferralCode) === normalizedReferralCode) {
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
        normalizeReferralCode(pendingEntry.referralCode) === normalizedReferralCode &&
        String(pendingEntry.status || '').toUpperCase() === 'PENDING'
      ) {
        pendingFromPendingUsers += 1;
      }
    }

    totalReferred += pendingFromPendingUsers;
    pendingReferred += pendingFromPendingUsers;

    // For referral withdrawals: only count referrals gained AFTER last withdrawal
    const newActiveReferrals = Math.max(0, activeReferred - activeReferralsAtLastWithdrawal);
    const maxReferralWithdrawal = newActiveReferrals * bonusKESForReferrer;

    return {
      totalReferred,
      pendingReferred,
      activeReferred,
      newActiveReferrals,
      maxReferralWithdrawal,
    };
  } catch (err) {
    console.error('getReferralStats error', err);
    return { totalReferred: 0, pendingReferred: 0, activeReferred: 0, newActiveReferrals: 0, maxReferralWithdrawal: 0 };
  }
}

async function creditReferralBonus(rdb, referralCode, referredEmail, bonus = undefined) {
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  if (!normalizedReferralCode) {
    console.warn('creditReferralBonus skipped: missing referralCode');
    return null;
  }

  // Reward depends on referrer's country unless explicit bonus is provided.
  let rewardKES;
  try {
    rewardKES = typeof bonus === 'number' ? bonus : await getReferrerBonusKES(rdb, normalizedReferralCode);
  } catch {
    rewardKES = typeof bonus === 'number' ? bonus : 0;
  }

  if (!rewardKES) {
    // no country mapping or referrer not found
    console.warn(`creditReferralBonus skipped: rewardKES is 0 for code ${normalizedReferralCode}`);
    return null;
  }

  try {
    const refSnap = await rdb
      .ref('users')
      .orderByChild('referralCode')
      .equalTo(normalizedReferralCode)
      .limitToFirst(1)
      .get();

    if (!refSnap.exists()) {
      console.warn(`creditReferralBonus skipped: no referrer found for code ${normalizedReferralCode}`);
      return null;
    }

    const entries = Object.entries(refSnap.val() || {});
    const [refUid, refUser] = entries[0];

    // Prevent self-referral
    if (refUser?.email && referredEmail && refUser.email === referredEmail) {
      console.warn(`creditReferralBonus skipped: self-referral prevented for ${referredEmail}`);
      return null;
    }

    // Prevent duplicate crediting for the same referredEmail
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
    const wallet = walletSnap.exists()
      ? walletSnap.val()
      : { taskBalance: 0, referralBalance: 0, totalEarnings: 0, availableBalance: 0 };

    const currentTaskBalance = Number(wallet.taskBalance || 0);
    const currentReferralBalance = Number(wallet.referralBalance || 0);
    const currentAvailableBalance = wallet.availableBalance !== undefined && wallet.availableBalance !== null
      ? Number(wallet.availableBalance)
      : currentTaskBalance + currentReferralBalance;
    const currentTotalEarnings = Number(wallet.totalEarnings || 0);

    const newReferralBalance = currentReferralBalance + rewardKES;
    const newTotalEarnings = currentTotalEarnings + rewardKES;
    const newAvailableBalance = currentAvailableBalance + rewardKES;

    await walletRef.update({
      taskBalance: currentTaskBalance,
      referralBalance: newReferralBalance,
      totalEarnings: newTotalEarnings,
      availableBalance: newAvailableBalance,
      updatedAt: new Date().toISOString(),
    });

    const txRef = rdb.ref(`users/${refUid}/wallet/transactions`).push();
    await txRef.set({
      type: 'referral',
      amount: rewardKES,
      description: `Referral bonus for inviting ${referredEmail || 'a user'}`,
      status: 'credited',
      createdAt: new Date().toISOString(),
    });

    const notifRef = rdb.ref(`users/${refUid}/notifications`).push();
    const notifId = notifRef.key;
    const currencyCode = getCurrencyCodeForCountry(refUser?.country || 'Kenya');
    await notifRef.set({
      id: notifId,
      type: 'referral',
      amount: rewardKES,
      message: `You've earned ${currencyCode} ${rewardKES} from a referral.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return { refUid, bonus: rewardKES };
  } catch (err) {
    console.error('creditReferralBonus error', err);
    return null;
  }
}

export default { generateUniqueReferralCode, creditReferralBonus, findUserByReferralCode, getReferralStats };

