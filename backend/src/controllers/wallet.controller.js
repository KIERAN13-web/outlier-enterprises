import firebaseAdmin from '../services/firebaseAdmin.js';
import referralService from '../services/referralService.js';

// Get user's wallet/earnings
async function getWallet(req, res) {
  try {
    const { uid } = req.user;
    const rdb = firebaseAdmin.database();

    const snap = await rdb.ref(`users/${uid}/wallet`).get();
    const wallet = snap.exists() ? snap.val() : {
      taskBalance: 0,
      referralBalance: 0,
      totalEarnings: 0,
      availableBalance: 0,
      withdrawals: [],
      transactions: [],
      activeReferralsAtLastWithdrawal: 0,
    };
    const taskBalance = Number(wallet.taskBalance || 0);
    const referralBalance = Number(wallet.referralBalance || 0);
    const totalEarnings = wallet.totalEarnings !== undefined && wallet.totalEarnings !== null
      ? Number(wallet.totalEarnings)
      : taskBalance + referralBalance;
    const availableBalance = Number(wallet.availableBalance ?? taskBalance + referralBalance);

    const withdrawalsSnap = await rdb.ref(`users/${uid}/wallet/withdrawals`).get();
    const withdrawals = withdrawalsSnap.exists()
      ? Object.entries(withdrawalsSnap.val()).map(([id, data]) => ({ id, ...data }))
      : [];

    const totalWithdrawn = withdrawals.reduce((sum, withdrawal) => {
      if (withdrawal.status === 'paid') {
        return sum + (withdrawal.amount || 0);
      }
      return sum;
    }, 0);

    // Get user profile for display
    const userRef = rdb.ref(`users/${uid}`);
    const userSnap = await userRef.get();
    const userProfile = userSnap.exists() ? userSnap.val() : {};
    let referralCode = userProfile?.referralCode || null;

    if (!referralCode) {
      try {
        referralCode = await referralService.generateUniqueReferralCode(rdb);
        await userRef.update({
          referralCode,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Unable to generate referral code for wallet request', err);
        referralCode = null;
      }
    }

    const activeReferralsAtLastWithdrawal = Number(wallet.activeReferralsAtLastWithdrawal || 0);
    const referralStats = referralCode
      ? await referralService.getReferralStats(rdb, referralCode, activeReferralsAtLastWithdrawal)
      : { totalReferred: 0, pendingReferred: 0, activeReferred: 0, newActiveReferrals: 0, maxReferralWithdrawal: 0 };
    // fetch notifications (include unread only)
    const notSnap = await rdb.ref(`users/${uid}/notifications`).get();
    const notifications = notSnap.exists()
      ? Object.entries(notSnap.val()).map(([nid, data]) => ({ id: nid, ...data }))
      : [];

    return res.json({
      ok: true,
      wallet: {
        ...wallet,
        taskBalance,
        referralBalance,
        totalEarnings,
        availableBalance,
        withdrawals: withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)),
        totalWithdrawn,
        referralStats,
        activeReferralsAtLastWithdrawal,
      },
      user: {
        name: userProfile.fullName || userProfile.name || 'User',
        email: userProfile.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        referralCode,
        isPaid: Boolean(userProfile.isPaid),
        notifications: notifications.filter((n) => n.read !== true),
      },
    });
  } catch (err) {
    console.error('getWallet error', err);
    return res.status(500).json({ ok: false, error: 'GET_WALLET_FAILED' });
  }
}

  // Mark a notification as read
  async function markNotificationRead(req, res) {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      if (!id) return res.status(400).json({ ok: false, error: 'id_required' });

      const rdb = firebaseAdmin.database();
      const notifRef = rdb.ref(`users/${uid}/notifications/${id}`);
      const snap = await notifRef.get();
      if (!snap.exists()) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });

      await notifRef.update({ read: true, readAt: new Date().toISOString() });
      return res.json({ ok: true });
    } catch (err) {
      console.error('markNotificationRead error', err);
      return res.status(500).json({ ok: false, error: 'MARK_FAILED' });
    }
  }

// Withdraw funds
async function withdraw(req, res) {
  try {
    const { uid } = req.user;
    const { amount, phoneNumber, earningType } = req.body;

    if (!amount || !phoneNumber || !earningType) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_WITHDRAWAL_AMOUNT',
        message: 'Withdrawal amount must be a positive number.',
      });
    }

    const rdb = firebaseAdmin.database();
    const userSnap = await rdb.ref(`users/${uid}`).get();
    const userProfile = userSnap.exists() ? userSnap.val() : {};
    if (!userProfile.isPaid) {
      return res.status(403).json({ ok: false, error: 'PAYMENT_REQUIRED', message: 'Activate your account with KES 1 before making withdrawals.' });
    }

    // Set minimum based on earning type
    const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
    const wallet = walletSnap.exists() ? walletSnap.val() : {
      taskBalance: 0,
      referralBalance: 0,
      totalEarnings: 0,
      withdrawals: [],
      transactions: [],
      activeReferralsAtLastWithdrawal: 0,
    };

    const activeReferralsAtLastWithdrawal = Number(wallet.activeReferralsAtLastWithdrawal || 0);
    const referralStats = userProfile?.referralCode
      ? await referralService.getReferralStats(rdb, userProfile.referralCode, activeReferralsAtLastWithdrawal)
      : { totalReferred: 0, pendingReferred: 0, activeReferred: 0, newActiveReferrals: 0, maxReferralWithdrawal: 0 };

    const MIN_WITHDRAWAL = earningType === 'task' ? 1000 : 1;
    
    // For task withdrawals: need 20 active referrals (unchanged)
    if (earningType === 'task' && referralStats.activeReferred < 20) {
      return res.status(400).json({
        ok: false,
        error: 'TASK_WITHDRAWAL_REQUIRES_ACTIVE_REFERRALS',
        message: `You need at least 20 active referrals for task withdrawal. You have ${referralStats.activeReferred} active.`,
      });
    }
    
    // For referral withdrawals: validate against max based on NEW referrals since last withdrawal
    if (earningType === 'referral' && referralStats.maxReferralWithdrawal < parsedAmount) {
      return res.status(400).json({
        ok: false,
        error: 'REFERRAL_WITHDRAWAL_LIMIT',
        message: `You can withdraw at most KES ${referralStats.maxReferralWithdrawal} from referral earnings. (${referralStats.newActiveReferrals} new active referrals × KES 50)`,
      });
    }
    
    if (parsedAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        ok: false,
        error: 'MINIMUM_WITHDRAWAL',
        message: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}`,
      });
    }


    // Get current wallet
    const balanceField = earningType === 'task' ? 'taskBalance' : 'referralBalance';
    const currentBalance = Number(wallet[balanceField] || 0);

    // Check sufficient balance
    if (currentBalance <= 0 || currentBalance < parsedAmount) {
      return res.status(400).json({
        ok: false,
        error: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient funds to withdraw.',
        availableBalance: currentBalance,
      });
    }

    // Create withdrawal record
    const withdrawalRef = rdb.ref(`users/${uid}/wallet/withdrawals`).push();
    const withdrawalId = withdrawalRef.key;

    const withdrawalData = {
      withdrawalId,
      amount,
      phoneNumber,
      earningType,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      paidAt: null,
    };

    await withdrawalRef.set(withdrawalData);

    // Update the appropriate balance
    const updateObj = {
      [balanceField]: currentBalance - parsedAmount,
      availableBalance: Number(wallet.availableBalance ?? Number(wallet.taskBalance || 0) + Number(wallet.referralBalance || 0)) - parsedAmount,
      updatedAt: new Date().toISOString(),
    };
    await rdb.ref(`users/${uid}/wallet`).update(updateObj);

    // Add transaction record
    const transactionRef = rdb.ref(`users/${uid}/wallet/transactions`).push();
    await transactionRef.set({
      type: 'withdrawal',
      amount: -amount,
      description: `Withdrawal request from ${earningType} earnings`,
      earningType,
      status: 'pending',
      phoneNumber,
      withdrawalId,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      withdrawalId,
      withdrawal: withdrawalData,
      newBalance: currentBalance - amount,
    });
  } catch (err) {
    console.error('withdraw error', err);
    return res.status(500).json({ ok: false, error: 'WITHDRAWAL_FAILED' });
  }
}

// Get user's withdrawal history
async function getWithdrawals(req, res) {
  try {
    const { uid } = req.user;
    const rdb = firebaseAdmin.database();

    const snap = await rdb.ref(`users/${uid}/wallet/withdrawals`).get();
    const withdrawals = snap.exists() ? Object.entries(snap.val()).map(([id, data]) => ({
      id,
      ...data,
    })) : [];

    return res.json({
      ok: true,
      withdrawals: withdrawals.sort((a, b) => 
        new Date(b.requestedAt) - new Date(a.requestedAt)
      ),
    });
  } catch (err) {
    console.error('getWithdrawals error', err);
    return res.status(500).json({ ok: false, error: 'GET_WITHDRAWALS_FAILED' });
  }
}

export default { getWallet, withdraw, getWithdrawals, markNotificationRead };
