import firebaseAdmin from '../services/firebaseAdmin.js';
import paymentController from './payment.controller.js';

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

    const userData = userSnap.val();
    const currentlyAdmin = Boolean(userData.isAdmin);

    if (makeAdmin === true && !currentlyAdmin) {
      const adminsSnap = await rdb.ref('users').orderByChild('isAdmin').equalTo(true).get();
      const adminCount = adminsSnap.exists() ? Object.keys(adminsSnap.val()).length : 0;
      if (adminCount >= 2) {
        return res.status(400).json({ ok: false, error: 'admin_limit_reached', message: 'Maximum of two admins allowed' });
      }
    }

    // Update admin role
    await rdb.ref(`users/${uid}`).update({
      isAdmin: makeAdmin === true,
      updatedAt: new Date().toISOString(),
    });

    try {
      await firebaseAdmin.auth().setCustomUserClaims(uid, {
        isAdmin: makeAdmin === true,
      });
    } catch (claimError) {
      console.warn('Unable to set admin custom claim after role toggle:', claimError);
    }

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

async function getPendingRegistrations(req, res) {
  try {
    const rdb = firebaseAdmin.database();
    const snap = await rdb.ref('pendingUsers').orderByChild('createdAt').get();

    if (!snap.exists()) {
      return res.json({ ok: true, pendingRegistrations: [] });
    }

    const rawValue = snap.val();
    if (!rawValue || typeof rawValue !== 'object') {
      return res.json({ ok: true, pendingRegistrations: [] });
    }

    const pendingRegistrations = Object.entries(rawValue)
      .filter(([, data]) => data && typeof data === 'object')
      .map(([pendingId, data]) => ({
        pendingId,
        email: data.email,
        name: data.name || null,
        phoneNumber: data.phoneNumber || null,
        country: data.country || null,
        idNumber: data.idNumber || null,
        status: data.status || 'unknown',
        paymentMethod: data.paymentMethod || 'unknown',
        tillNumber: data.tillNumber || null,
        paymentCode: data.paymentCode || null,
        referralCode: data.referralCode || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      }))
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    return res.json({ ok: true, pendingRegistrations });
  } catch (err) {
    console.error('getPendingRegistrations error', err);
    return res.status(500).json({ ok: false, error: 'GET_PENDING_REGISTRATIONS_FAILED', message: err.message });
  }
}

async function approvePendingRegistration(req, res) {
  try {
    const { pendingId } = req.params;
    if (!pendingId) {
      return res.status(400).json({ ok: false, error: 'pendingId_required' });
    }

    const result = await paymentController.approvePendingUserRegistration(pendingId);
    return res.json({ ok: true, pendingId, status: result.status, uid: result.uid || null });
  } catch (err) {
    console.error('approvePendingRegistration error', err);
    return res.status(500).json({ ok: false, error: 'APPROVAL_FAILED', message: err.message });
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

      // Restore funds to the appropriate balance based on earning type
      const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
      const wallet = walletSnap.exists() ? walletSnap.val() : { taskBalance: 0, referralBalance: 0 };
      
      const balanceField = withdrawal.earningType === 'task' ? 'taskBalance' : 'referralBalance';
      const currentBalance = wallet[balanceField] || 0;
      
      const updateObj = {
        [balanceField]: currentBalance + (withdrawal.amount || 0),
      };
      
      await rdb.ref(`users/${uid}/wallet`).update(updateObj);
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
      taskBalance: 0,
      referralBalance: 0,
      totalEarnings: 0,
      withdrawals: [],
      transactions: [],
    };

    const newReferralBalance = (wallet.referralBalance || 0) + amount;
    const newTotalEarnings = (wallet.totalEarnings || 0) + amount;

    await rdb.ref(`users/${uid}/wallet`).update({
      referralBalance: newReferralBalance,
      totalEarnings: newTotalEarnings,
      updatedAt: new Date().toISOString(),
    });

    // Add transaction record
    const transactionRef = rdb.ref(`users/${uid}/wallet/transactions`).push();
    await transactionRef.set({
      type: 'admin_fund',
      amount,
      description: reason || 'Admin funding',
      earningType: 'referral',
      status: 'completed',
      fundedAt: new Date().toISOString(),
      fundedBy: 'admin',
    });

    return res.json({
      ok: true,
      message: 'User account funded successfully',
      newReferralBalance,
      newTotalEarnings,
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
          pendingWithdrawalAmount: 0,
          pendingRegistrations: 0,
        },
      });
    }

    const pendingUsersSnap = await rdb.ref('pendingUsers').orderByChild('status').equalTo('PENDING').get();
    const pendingRegistrationsCount = pendingUsersSnap.exists() && pendingUsersSnap.val() && typeof pendingUsersSnap.val() === 'object'
      ? Object.keys(pendingUsersSnap.val()).length
      : 0;

    const allUsers = usersSnap.val();
    const usersObject = allUsers && typeof allUsers === 'object' ? allUsers : {};

    let totalUsers = 0;
    let paidUsers = 0;
    let totalEarnings = 0;
    let pendingWithdrawals = 0;
    let pendingWithdrawalAmount = 0;

    for (const userData of Object.values(usersObject)) {
      if (!userData || typeof userData !== 'object') continue;
      totalUsers++;
      if (userData.isPaid) paidUsers++;
      if (userData.wallet && typeof userData.wallet === 'object') {
        totalEarnings += Number(userData.wallet.totalEarnings || 0);
        if (userData.wallet.withdrawals && typeof userData.wallet.withdrawals === 'object') {
          for (const withdrawal of Object.values(userData.wallet.withdrawals)) {
            if (withdrawal && withdrawal.status === 'pending') {
              pendingWithdrawals++;
              pendingWithdrawalAmount += Number(withdrawal.amount || 0);
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
        pendingRegistrations: pendingRegistrationsCount,
      },
    });
  } catch (err) {
    console.error('getDashboardStats error', err);
    return res.status(500).json({ ok: false, error: 'STATS_FAILED', message: err.message });
  }
}

export default {
  toggleAdminRole,
  searchUsers,
  getUserDetails,
  getPendingRegistrations,
  approvePendingRegistration,
  updateWithdrawal,
  approveWithdrawal,
  markWithdrawalPaid,
  getAllWithdrawals,
  fundUser,
  getPendingWithdrawals,
  getDashboardStats,
};
