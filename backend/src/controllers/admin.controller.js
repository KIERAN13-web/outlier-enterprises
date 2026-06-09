import firebaseAdmin from '../services/firebaseAdmin.js';

// Toggle admin role for a user
async function toggleAdminRole(req, res) {
  try {
    const { uid, makeAdmin } = req.body;

    if (!uid || makeAdmin === undefined) {
      return res.status(400).json({ ok: false, error: 'uid_and_makeAdmin_required' });
    }

    const rdb = firebaseAdmin.database();

    // Verify user exists
    const userSnap = await rdb.ref(`users/${uid}`).get();
    if (!userSnap.exists()) {
      return res.status(404).json({ ok: false, error: 'user_not_found' });
    }

    // Update admin role
    await rdb.ref(`users/${uid}`).update({
      isAdmin: makeAdmin === true,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: `User ${makeAdmin ? 'promoted to' : 'removed from'} admin role`,
      isAdmin: makeAdmin,
    });
  } catch (err) {
    console.error('toggleAdminRole error', err);
    return res.status(500).json({ ok: false, error: 'TOGGLE_FAILED' });
  }
}

// Search users by name or phone
async function searchUsers(req, res) {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'query_too_short' });
    }

    const rdb = firebaseAdmin.database();
    const usersSnap = await rdb.ref('users').get();

    if (!usersSnap.exists()) {
      return res.json({ ok: true, users: [] });
    }

    const allUsers = usersSnap.val();
    const queryLower = query.toLowerCase();

    const results = Object.entries(allUsers).map(([uid, data]) => ({
      uid,
      ...data,
    })).filter(user => 
      (user.fullName && user.fullName.toLowerCase().includes(queryLower)) ||
      (user.phoneNumber && user.phoneNumber.includes(query))
    ).slice(0, 50);

    return res.json({
      ok: true,
      users: results,
      count: results.length,
    });
  } catch (err) {
    console.error('searchUsers error', err);
    return res.status(500).json({ ok: false, error: 'SEARCH_FAILED' });
  }
}

// Get user details
async function getUserDetails(req, res) {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid_required' });
    }

    const rdb = firebaseAdmin.database();
    const userSnap = await rdb.ref(`users/${uid}`).get();

    if (!userSnap.exists()) {
      return res.status(404).json({ ok: false, error: 'user_not_found' });
    }

    const user = userSnap.val();

    // Get wallet info
    const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
    const wallet = walletSnap.exists() ? walletSnap.val() : {};

    // Get withdrawals
    const withdrawalsSnap = await rdb.ref(`users/${uid}/wallet/withdrawals`).get();
    const withdrawals = withdrawalsSnap.exists() 
      ? Object.entries(withdrawalsSnap.val()).map(([id, data]) => ({ id, ...data }))
      : [];

    return res.json({
      ok: true,
      user: {
        uid,
        ...user,
        wallet,
        withdrawals: withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)),
      },
    });
  } catch (err) {
    console.error('getUserDetails error', err);
    return res.status(500).json({ ok: false, error: 'GET_DETAILS_FAILED' });
  }
}

// Approve or reject withdrawal
async function updateWithdrawal(req, res) {
  try {
    const { uid, withdrawalId, status } = req.body;

    if (!uid || !withdrawalId || !status) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'invalid_status' });
    }

    const rdb = firebaseAdmin.database();

    const withdrawalRef = rdb.ref(`users/${uid}/wallet/withdrawals/${withdrawalId}`);
    const withdrawalSnap = await withdrawalRef.get();
    if (!withdrawalSnap.exists()) {
      return res.status(404).json({ ok: false, error: 'withdrawal_not_found' });
    }

    const withdrawal = withdrawalSnap.val();

    if (status === 'approved') {
      await withdrawalRef.update({
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });
      await updateWithdrawalTransactionStatus(uid, withdrawalId, 'approved');
    } else {
      await withdrawalRef.update({
        status: 'rejected',
        approvedAt: null,
      });

      const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
      const wallet = walletSnap.exists() ? walletSnap.val() : { availableBalance: 0 };
      await rdb.ref(`users/${uid}/wallet`).update({
        availableBalance: (wallet.availableBalance || 0) + (withdrawal.amount || 0),
      });
      await updateWithdrawalTransactionStatus(uid, withdrawalId, 'rejected');
    }

    return res.json({ ok: true, status: 'updated' });
  } catch (err) {
    console.error('updateWithdrawal error', err);
    return res.status(500).json({ ok: false, error: 'UPDATE_FAILED' });
  }
}

async function approveWithdrawal(req, res) {
  try {
    const { uid, withdrawalId } = req.params;
    if (!uid || !withdrawalId) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    const rdb = firebaseAdmin.database();
    const withdrawalRef = rdb.ref(`users/${uid}/wallet/withdrawals/${withdrawalId}`);
    const withdrawalSnap = await withdrawalRef.get();

    if (!withdrawalSnap.exists()) {
      return res.status(404).json({ ok: false, error: 'withdrawal_not_found' });
    }

    const withdrawal = withdrawalSnap.val();
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'invalid_withdrawal_status' });
    }

    await withdrawalRef.update({
      status: 'approved',
      approvedAt: new Date().toISOString(),
    });
    await updateWithdrawalTransactionStatus(uid, withdrawalId, 'approved');

    return res.json({ ok: true, status: 'approved' });
  } catch (err) {
    console.error('approveWithdrawal error', err);
    return res.status(500).json({ ok: false, error: 'APPROVE_FAILED' });
  }
}

async function markWithdrawalPaid(req, res) {
  try {
    const { uid, withdrawalId } = req.params;
    if (!uid || !withdrawalId) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    const rdb = firebaseAdmin.database();
    const withdrawalRef = rdb.ref(`users/${uid}/wallet/withdrawals/${withdrawalId}`);
    const withdrawalSnap = await withdrawalRef.get();

    if (!withdrawalSnap.exists()) {
      return res.status(404).json({ ok: false, error: 'withdrawal_not_found' });
    }

    const withdrawal = withdrawalSnap.val();
    if (withdrawal.status !== 'approved') {
      return res.status(400).json({ ok: false, error: 'invalid_withdrawal_status' });
    }

    await withdrawalRef.update({
      status: 'paid',
      paidAt: new Date().toISOString(),
    });
    await updateWithdrawalTransactionStatus(uid, withdrawalId, 'paid');

    return res.json({ ok: true, status: 'paid' });
  } catch (err) {
    console.error('markWithdrawalPaid error', err);
    return res.status(500).json({ ok: false, error: 'MARK_PAID_FAILED' });
  }
}

async function updateWithdrawalTransactionStatus(uid, withdrawalId, status) {
  try {
    const rdb = firebaseAdmin.database();
    const txSnap = await rdb.ref(`users/${uid}/wallet/transactions`).get();
    if (!txSnap.exists()) return;

    const updates = {};
    for (const [txId, tx] of Object.entries(txSnap.val())) {
      if (tx.withdrawalId === withdrawalId) {
        updates[`users/${uid}/wallet/transactions/${txId}/status`] = status;
      }
    }

    if (Object.keys(updates).length > 0) {
      await rdb.ref().update(updates);
    }
  } catch (err) {
    console.error('updateWithdrawalTransactionStatus error', err);
  }
}

// Fund a user's account (add referral earnings)
async function fundUser(req, res) {
  try {
    const { uid, amount, reason } = req.body;

    if (!uid || !amount || amount <= 0) {
      return res.status(400).json({ ok: false, error: 'invalid_amount' });
    }

    const rdb = firebaseAdmin.database();

    // Get current wallet
    const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
    const wallet = walletSnap.exists() ? walletSnap.val() : {
      totalEarnings: 0,
      availableBalance: 0,
      referralEarnings: 0,
      withdrawals: [],
      transactions: [],
    };

    // Initialize referral earnings if not exists
    if (!wallet.referralEarnings) {
      wallet.referralEarnings = 0;
    }

    const newReferralEarnings = (wallet.referralEarnings || 0) + amount;
    const newAvailableBalance = (wallet.availableBalance || 0) + amount;

    await rdb.ref(`users/${uid}/wallet`).update({
      referralEarnings: newReferralEarnings,
      availableBalance: newAvailableBalance,
      totalEarnings: (wallet.totalEarnings || 0) + amount,
      updatedAt: new Date().toISOString(),
    });

    // Add transaction record
    const transactionRef = rdb.ref(`users/${uid}/wallet/transactions`).push();
    await transactionRef.set({
      type: 'referral_credit',
      amount,
      reason: reason || 'Admin fund',
      fundedAt: new Date().toISOString(),
      fundedBy: 'admin',
    });

    return res.json({
      ok: true,
      message: 'User account funded successfully',
      newReferralEarnings,
      newAvailableBalance,
    });
  } catch (err) {
    console.error('fundUser error', err);
    return res.status(500).json({ ok: false, error: 'FUND_FAILED' });
  }
}

// Get all pending withdrawals
async function getPendingWithdrawals(req, res) {
  try {
    const rdb = firebaseAdmin.database();
    const usersSnap = await rdb.ref('users').get();

    if (!usersSnap.exists()) {
      return res.json({ ok: true, pendingWithdrawals: [] });
    }

    const allUsers = usersSnap.val();
    const pendingWithdrawals = [];

    for (const [uid, userData] of Object.entries(allUsers)) {
      if (userData.wallet && userData.wallet.withdrawals) {
        for (const [withdrawalId, withdrawal] of Object.entries(userData.wallet.withdrawals)) {
          if (withdrawal.status === 'pending') {
            pendingWithdrawals.push({
              uid,
              withdrawalId,
              ...withdrawal,
              userName: userData.fullName || userData.email || uid,
              phoneNumber: userData.phoneNumber,
            });
          }
        }
      }
    }

    return res.json({
      ok: true,
      pendingWithdrawals: pendingWithdrawals.sort((a, b) => 
        new Date(a.requestedAt) - new Date(b.requestedAt)
      ),
      count: pendingWithdrawals.length,
    });
  } catch (err) {
    console.error('getPendingWithdrawals error', err);
    return res.status(500).json({ ok: false, error: 'GET_PENDING_FAILED' });
  }
}

// Get withdrawal request list for admin
async function getAllWithdrawals(req, res) {
  try {
    const rdb = firebaseAdmin.database();
    const usersSnap = await rdb.ref('users').get();

    if (!usersSnap.exists()) {
      return res.json({ ok: true, withdrawals: [] });
    }

    const allUsers = usersSnap.val();
    const withdrawals = [];

    for (const [uid, userData] of Object.entries(allUsers)) {
      if (userData.wallet && userData.wallet.withdrawals) {
        for (const [withdrawalId, withdrawal] of Object.entries(userData.wallet.withdrawals)) {
          withdrawals.push({
            uid,
            withdrawalId,
            ...withdrawal,
            userName: userData.fullName || userData.email || uid,
            phoneNumber: userData.phoneNumber,
          });
        }
      }
    }

    return res.json({
      ok: true,
      withdrawals: withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)),
      count: withdrawals.length,
    });
  } catch (err) {
    console.error('getAllWithdrawals error', err);
    return res.status(500).json({ ok: false, error: 'GET_ALL_WITHDRAWALS_FAILED' });
  }
}

// Get dashboard stats
async function getDashboardStats(req, res) {
  try {
    const rdb = firebaseAdmin.database();
    const usersSnap = await rdb.ref('users').get();

    if (!usersSnap.exists()) {
      return res.json({
        ok: true,
        stats: {
          totalUsers: 0,
          paidUsers: 0,
          totalEarnings: 0,
          pendingWithdrawals: 0,
        },
      });
    }

    const allUsers = usersSnap.val();
    let totalUsers = 0;
    let paidUsers = 0;
    let totalEarnings = 0;
    let pendingWithdrawals = 0;
    let pendingWithdrawalAmount = 0;

    for (const userData of Object.values(allUsers)) {
      totalUsers++;
      if (userData.isPaid) paidUsers++;
      if (userData.wallet) {
        totalEarnings += userData.wallet.totalEarnings || 0;
        if (userData.wallet.withdrawals) {
          for (const withdrawal of Object.values(userData.wallet.withdrawals)) {
            if (withdrawal.status === 'pending') {
              pendingWithdrawals++;
              pendingWithdrawalAmount += withdrawal.amount || 0;
            }
          }
        }
      }
    }

    return res.json({
      ok: true,
      stats: {
        totalUsers,
        paidUsers,
        totalEarnings,
        pendingWithdrawals,
        pendingWithdrawalAmount,
      },
    });
  } catch (err) {
    console.error('getDashboardStats error', err);
    return res.status(500).json({ ok: false, error: 'STATS_FAILED' });
  }
}

export default {
  toggleAdminRole,
  searchUsers,
  getUserDetails,
  updateWithdrawal,
  approveWithdrawal,
  markWithdrawalPaid,
  getAllWithdrawals,
  fundUser,
  getPendingWithdrawals,
  getDashboardStats,
};
