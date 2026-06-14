import firebaseAdmin from '../services/firebaseAdmin.js';

async function submitTask(req, res) {
  try {
    const { uid } = req.user;
    const { orderId, answers, totalQuestions, completedAt } = req.body;

    if (!orderId || !answers || !totalQuestions) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    const rdb = firebaseAdmin.database();

    // Save task submission
    const taskRef = rdb.ref(`users/${uid}/tasks`).push();
    const taskId = taskRef.key;

    const taskData = {
      taskId,
      orderId,
      uid,
      answers, // Object with question data and answers
      totalQuestions,
      submittedAt: completedAt || new Date().toISOString(),
      status: 'completed',
    };

    await taskRef.set(taskData);

    // Update the order status to 'completed'
    const orderRef = rdb.ref(`users/${uid}/orders/${orderId}`);
    await orderRef.update({
      status: 'completed',
      taskId,
      completedAt: completedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const orderSnap = await orderRef.get();
    if (!orderSnap.exists()) {
      return res.status(400).json({ ok: false, error: 'ORDER_NOT_FOUND' });
    }

    const orderAmount = Number(orderSnap.val().amount) || 1000;

    // Add earnings to wallet using the order amount
    const walletRef = rdb.ref(`users/${uid}/wallet`);
    const walletSnap = await walletRef.get();
    const currentWallet = walletSnap.exists() ? walletSnap.val() : {
      totalEarnings: 0,
      availableBalance: 0,
    };

    const newTotalEarnings = (currentWallet.totalEarnings || 0) + orderAmount;
    const newAvailableBalance = (currentWallet.availableBalance || 0) + orderAmount;

    await walletRef.update({
      totalEarnings: newTotalEarnings,
      availableBalance: newAvailableBalance,
      lastUpdated: new Date().toISOString(),
    });

    // Add transaction record
    const transactionRef = rdb.ref(`users/${uid}/wallet/transactions`).push();
    await transactionRef.set({
      type: 'task_completion',
      amount: orderAmount,
      taskId,
      orderId,
      createdAt: new Date().toISOString(),
    });

    return res.json({ ok: true, taskId, task: taskData });
  } catch (err) {
    console.error('submitTask error', err);
    return res.status(500).json({ ok: false, error: 'TASK_SUBMISSION_FAILED' });
  }
}

async function getTask(req, res) {
  try {
    const { uid } = req.user;
    const { taskId } = req.params;

    const rdb = firebaseAdmin.database();
    const snap = await rdb.ref(`users/${uid}/tasks/${taskId}`).get();

    if (!snap.exists()) {
      return res.status(404).json({ ok: false, error: 'TASK_NOT_FOUND' });
    }

    return res.json({ ok: true, task: snap.val() });
  } catch (err) {
    console.error('getTask error', err);
    return res.status(500).json({ ok: false, error: 'GET_TASK_FAILED' });
  }
}

async function getUserTasks(req, res) {
  try {
    const { uid } = req.user;
    const rdb = firebaseAdmin.database();

    const snap = await rdb.ref(`users/${uid}/tasks`).get();
    const val = snap.exists() ? snap.val() : {};
    const tasks = Object.entries(val || {})
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    return res.json({ ok: true, tasks });
  } catch (err) {
    console.error('getUserTasks error', err);
    return res.status(500).json({ ok: false, error: 'GET_TASKS_FAILED' });
  }
}

export default { submitTask, getTask, getUserTasks };
