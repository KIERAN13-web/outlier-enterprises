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
      withdrawals: [],
      transactions: [],
    };

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
    const userSnap = await rdb.ref(`users/${uid}`).get();
    const userProfile = userSnap.exists() ? userSnap.val() : {};
    const referralStats = userProfile?.referralCode
      ? await referralService.getReferralStats(rdb, userProfile.referralCode)
      : { totalReferred: 0, activeReferred: 0, maxReferralWithdrawal: 0 };
    // fetch notifications (include unread only)
    const notSnap = await rdb.ref(`users/${uid}/notifications`).get();
    const notifications = notSnap.exists()
      ? Object.entries(notSnap.val()).map(([nid, data]) => ({ id: nid, ...data }))
      : [];

    return res.json({
      ok: true,
      wallet: {
        ...wallet,
        withdrawals: withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)),
        totalWithdrawn,
        referralStats,
      },
      user: {
        name: userProfile.fullName || userProfile.name || 'User',
        email: userProfile.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        referralCode: userProfile.referralCode || null,
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

    const rdb = firebaseAdmin.database();
    const userSnap = await rdb.ref(`users/${uid}`).get();
    const userProfile = userSnap.exists() ? userSnap.val() : {};
    if (!userProfile.isPaid) {
      return res.status(403).json({ ok: false, error: 'PAYMENT_REQUIRED', message: 'Activate your account with KES 200 before making withdrawals.' });
    }

    // Set minimum based on earning type
    const referralStats = userProfile?.referralCode
      ? await referralService.getReferralStats(rdb, userProfile.referralCode)
      : { totalReferred: 0, activeReferred: 0, maxReferralWithdrawal: 0 };
    const MIN_WITHDRAWAL = earningType === 'task' ? 1000 : 1;
    if (earningType === 'task' && referralStats.activeReferred < 20) {
      return res.status(400).json({
        ok: false,
        error: 'TASK_WITHDRAWAL_REQUIRES_ACTIVE_REFERRALS',
        message: 'You need at least 20 active referrals before withdrawing task earnings.',
      });
    }
    if (earningType === 'referral' && referralStats.maxReferralWithdrawal < amount) {
      return res.status(400).json({
        ok: false,
        error: 'REFERRAL_WITHDRAWAL_LIMIT',
        message: `You can withdraw at most KES ${referralStats.maxReferralWithdrawal} from referral earnings based on your active referrals.`,
      });
    }
    if (amount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        ok: false,
        error: 'MINIMUM_WITHDRAWAL',
        message: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}`,
      });
    }


    // Get current wallet
    const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
    const wallet = walletSnap.exists() ? walletSnap.val() : {
      taskBalance: 0,
      referralBalance: 0,
      totalEarnings: 0,
      withdrawals: [],
      transactions: [],
    };

    const balanceField = earningType === 'task' ? 'taskBalance' : 'referralBalance';
    const currentBalance = wallet[balanceField] || 0;

    // Check sufficient balance
    if (currentBalance < amount) {
      return res.status(400).json({
        ok: false,
        error: 'INSUFFICIENT_BALANCE',
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
      [balanceField]: currentBalance - amount,
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
