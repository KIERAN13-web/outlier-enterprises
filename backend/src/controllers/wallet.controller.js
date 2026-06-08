import firebaseAdmin from '../services/firebaseAdmin.js';

// Get user's wallet/earnings
async function getWallet(req, res) {
  try {
    const { uid } = req.user;
    const rdb = firebaseAdmin.database();

    const snap = await rdb.ref(`users/${uid}/wallet`).get();
    const wallet = snap.exists() ? snap.val() : {
      totalEarnings: 0,
      availableBalance: 0,
      withdrawals: [],
      transactions: [],
    };

    // Get user profile for display
    const userSnap = await rdb.ref(`users/${uid}`).get();
    const userProfile = userSnap.exists() ? userSnap.val() : {};

    return res.json({
      ok: true,
      wallet,
      user: {
        name: userProfile.name || 'User',
        email: userProfile.email || '',
        phoneNumber: userProfile.phoneNumber || '',
      },
    });
  } catch (err) {
    console.error('getWallet error', err);
    return res.status(500).json({ ok: false, error: 'GET_WALLET_FAILED' });
  }
}

// Withdraw funds
async function withdraw(req, res) {
  try {
    const { uid } = req.user;
    const { amount, phoneNumber } = req.body;

    if (!amount || !phoneNumber) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    // Minimum withdrawal amount
    const MIN_WITHDRAWAL = 15000;
    if (amount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        ok: false,
        error: 'MINIMUM_WITHDRAWAL',
        message: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}`,
      });
    }

    const rdb = firebaseAdmin.database();

    // Get current wallet
    const walletSnap = await rdb.ref(`users/${uid}/wallet`).get();
    const wallet = walletSnap.exists() ? walletSnap.val() : {
      totalEarnings: 0,
      availableBalance: 0,
      withdrawals: [],
      transactions: [],
    };

    // Check sufficient balance
    if (wallet.availableBalance < amount) {
      return res.status(400).json({
        ok: false,
        error: 'INSUFFICIENT_BALANCE',
        availableBalance: wallet.availableBalance,
      });
    }

    // Create withdrawal record
    const withdrawalRef = rdb.ref(`users/${uid}/wallet/withdrawals`).push();
    const withdrawalId = withdrawalRef.key;

    const withdrawalData = {
      withdrawalId,
      amount,
      phoneNumber,
      status: 'pending', // pending, completed, failed
      requestedAt: new Date().toISOString(),
      completedAt: null,
    };

    await withdrawalRef.set(withdrawalData);

    // Update available balance
    const newBalance = wallet.availableBalance - amount;
    await rdb.ref(`users/${uid}/wallet`).update({
      availableBalance: newBalance,
      updatedAt: new Date().toISOString(),
    });

    // Add transaction record
    const transactionRef = rdb.ref(`users/${uid}/wallet/transactions`).push();
    await transactionRef.set({
      type: 'withdrawal',
      amount: -amount,
      phoneNumber,
      status: 'pending',
      withdrawalId,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      withdrawalId,
      withdrawal: withdrawalData,
      newBalance,
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

export default { getWallet, withdraw, getWithdrawals };
