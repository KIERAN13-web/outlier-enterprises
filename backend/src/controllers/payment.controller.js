import firebaseAdmin from '../services/firebaseAdmin.js';
import paymentProvider from '../services/paymentProvider.js';
import referralService from '../services/referralService.js';
import { parseAmount, validateOrderAmount } from '../utils/orderValidation.js';
import { activatePendingRegistration } from '../utils/paymentStatus.js';

const PAID_AMOUNT = 200;
const VERIFICATION_TIME = 2 * 60 * 1000; // 2 minutes in milliseconds
const MAX_ORDERS_PER_WEEK = Number(process.env.MAX_ORDERS_PER_WEEK) || 5;
const MAX_ORDERS_PER_DAY = Number(process.env.MAX_ORDERS_PER_DAY) || 1;

// Helper function to check order limits (7-day rolling window)
async function checkOrderLimits(uid) {
  const rdb = firebaseAdmin.database();
  const snap = await rdb.ref(`users/${uid}/orders`).get();
  
  if (!snap.exists()) {
    return { ok: true };
  }

  const orders = snap.val();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let ordersToday = 0;
  let ordersInLast7Days = 0;

  Object.values(orders).forEach((order) => {
    const orderDate = order.createdAt.split('T')[0];
    const orderTime = new Date(order.createdAt).getTime();
    
    // Count orders from today
    if (orderDate === today) {
      ordersToday++;
    }
    
    // Count orders from the last 7 days
    if (orderTime >= sevenDaysAgo.getTime()) {
      ordersInLast7Days++;
    }
  });

  if (ordersToday >= MAX_ORDERS_PER_DAY) {
    return { ok: false, error: 'MAX_ORDERS_PER_DAY_EXCEEDED', message: 'You can only place 1 order per day' };
  }

  if (ordersInLast7Days >= MAX_ORDERS_PER_WEEK) {
    return { ok: false, error: 'MAX_ORDERS_PER_WEEK_EXCEEDED', message: 'You can only place 5 orders per week' };
  }

  return { ok: true };
}

async function placeOrder(req, res) {
  try {
    const { uid, email } = req.user;
    const { accountId, accountName, amount } = req.body;

    const parsedResult = parseAmount(amount);
    if (!accountId || !parsedResult.ok) {
      return res.status(400).json({
        ok: false,
        error: parsedResult.error || 'accountId_and_amount_required',
        message: parsedResult.message || 'accountId and amount are required.',
      });
    }

    const validationResult = validateOrderAmount(parsedResult.value);
    if (!validationResult.ok) {
      return res.status(400).json(validationResult);
    }

    // Check order limits
    const limitCheck = await checkOrderLimits(uid);
    if (!limitCheck.ok) {
      return res.status(400).json({ ok: false, error: limitCheck.error, message: limitCheck.message });
    }

    const order = await createOrder(uid, accountName || accountId, email, parsedResult.value);

    return res.json({ ok: true, order });
  } catch (err) {
    console.error('placeOrder error', err);
    return res.status(500).json({ ok: false, error: 'PLACE_ORDER_FAILED' });
  }
}

// Helper function to create orders with custom amounts
async function createOrder(uid, accountInfo, email, customAmount = null, options = {}) {
  const rdb = firebaseAdmin.database();
  const ordersRef = rdb.ref(`users/${uid}/orders`).push();
  const orderId = ordersRef.key;

  const amount = customAmount || PAID_AMOUNT;

  const orderData = {
    id: orderId,
    uid,
    accountInfo,
    email,
    amount,
    status: 'pending',
    checkoutRequestId: options.checkoutRequestId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ordersRef.set(orderData);

  if (options.autoVerify !== false) {
    setTimeout(async () => {
      try {
        await rdb.ref(`users/${uid}/orders/${orderId}`).update({
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Auto-verification failed for order:', orderId, err);
      }
    }, VERIFICATION_TIME);
  }

  return { orderId, ...orderData };
}

async function createStkPush(req, res) {
  try {
    const { uid, email } = req.user;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ ok: false, error: 'phoneNumber_required' });
    }

    // Check order limits
    const limitCheck = await checkOrderLimits(uid);
    if (!limitCheck.ok) {
      return res.status(400).json({ ok: false, error: limitCheck.error, message: limitCheck.message });
    }

    const result = await paymentProvider.createStkPush({
      uid,
      email,
      phoneNumber,
      amount: PAID_AMOUNT,
    });

    const order = await createOrder(uid, phoneNumber, email, PAID_AMOUNT, {
      autoVerify: false,
      checkoutRequestId: result.checkoutRequestId,
    });

    const rdb = firebaseAdmin.database();
    const pendingRef = rdb.ref('pendingPayments').push();
    const pendingId = pendingRef.key;

    await pendingRef.set({
      uid,
      email,
      phoneNumber: result.phoneNumber,
      amount: PAID_AMOUNT,
      status: 'PENDING',
      checkoutRequestId: result.checkoutRequestId,
      orderId: order.orderId,
      type: 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true, payment: result, order, pendingId });
  } catch (err) {
    console.error('createStkPush error', err);
    return res.status(500).json({ ok: false, error: 'STK_PUSH_FAILED' });
  }
}

async function createStkPushGuest(req, res) {
  try {
    const { email, password, phoneNumber, referralCode, name, country, idNumber } = req.body;

    if (!email || !password || !phoneNumber) {
      return res.status(400).json({ ok: false, error: 'email_password_phone_required' });
    }

    const result = await paymentProvider.createStkPush({ uid: null, email, phoneNumber, amount: PAID_AMOUNT });

    const rdb = firebaseAdmin.database();
    const pendingRef = rdb.ref('pendingPayments').push();
    const pendingId = pendingRef.key;

    await pendingRef.set({
      email,
      password,
      phoneNumber: result.phoneNumber,
      name: name || null,
      country: country || null,
      idNumber: idNumber || null,
      status: 'PENDING',
      checkoutRequestId: result.checkoutRequestId || null,
      type: 'GUEST',
      referralCode: referralCode || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await rdb.ref(`pendingUsers/${pendingId}`).set({
      email,
      password,
      phoneNumber: result.phoneNumber,
      name: name || null,
      country: country || null,
      idNumber: idNumber || null,
      status: 'PENDING',
      checkoutRequestId: result.checkoutRequestId || null,
      type: 'GUEST',
      paymentMethod: 'mpesa',
      referralCode: referralCode || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true, payment: result, pendingId });
  } catch (err) {
    console.error('createStkPushGuest error', err);
    return res.status(500).json({ ok: false, error: 'STK_PUSH_GUEST_FAILED' });
  }
}

async function createManualGuest(req, res) {
  try {
    const { email, password, phoneNumber, name, country, idNumber, referralCode, paymentCode } = req.body;

    const rdb = firebaseAdmin.database();
    const pendingRef = rdb.ref('pendingUsers').push();
    const pendingId = pendingRef.key;

    // Just collect the data - no validation, admins will verify
    await pendingRef.set({
      email: email || null,
      password: password || null,
      phoneNumber: phoneNumber || null,
      name: name || null,
      country: country || null,
      idNumber: idNumber || null,
      status: 'PENDING',
      type: 'GUEST',
      paymentMethod: 'manual',
      tillNumber: '3124553',
      paymentCode: paymentCode || null,
      referralCode: referralCode || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      pendingId,
      paymentMethod: 'manual',
      tillNumber: '3124553',
      message: 'Till payment request recorded. Pay KES 200 using till 3124553 and wait for admin approval.',
    });
  } catch (err) {
    console.error('createManualGuest error', err);
    return res.status(500).json({ ok: false, error: 'MANUAL_GUEST_FAILED' });
  }
}

async function findPendingPaymentByCheckoutRequestId(checkoutRequestId) {
  const rdb = firebaseAdmin.database();
  const snaps = await rdb.ref('pendingPayments').orderByChild('checkoutRequestId').equalTo(checkoutRequestId).limitToFirst(1).get();
  if (!snaps.exists()) return null;

  const val = snaps.val();
  const entries = Object.entries(val || {});
  const [key, data] = entries[0];
  return { key, data };
}

async function findPendingPaymentByPendingId(pendingId) {
  const rdb = firebaseAdmin.database();
  const snap = await rdb.ref(`pendingPayments/${pendingId}`).get();
  if (!snap.exists()) return null;

  return { key: pendingId, data: snap.val() };
}

async function cleanupPendingApproval(pendingId) {
  const rdb = firebaseAdmin.database();
  await Promise.all([
    rdb.ref(`pendingUsers/${pendingId}`).remove(),
    rdb.ref(`pendingPayments/${pendingId}`).remove(),
  ]);
}

async function processPendingPayment({ pendingKey, data, status }) {
  const rdb = firebaseAdmin.database();
  const docRef = rdb.ref(`pendingPayments/${pendingKey}`);
  const pendingUserRef = data.type === 'GUEST' ? rdb.ref(`pendingUsers/${pendingKey}`) : null;

  if (status === 'SUCCESS') {
    if (data.type === 'USER' && data.uid) {
      await rdb.ref(`users/${data.uid}`).update({
        isPaid: true,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (data.orderId) {
        await rdb.ref(`users/${data.uid}/orders/${data.orderId}`).update({
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await docRef.remove();
      return;
    }

    if (data.type === 'GUEST') {
      try {
        const userRecord = await firebaseAdmin.auth().createUser({ 
          email: data.email, 
          password: data.password,
          displayName: data.name || null,
        });
        const newUid = userRecord.uid;
        const referrerCode = data.referralCode || null;
        const referralCodeForNewUser = await (async () => {
          try {
            return await (await import('../services/referralService.js')).default.generateUniqueReferralCode(rdb);
          } catch (e) {
            return `R${newUid.slice(0,8)}`;
          }
        })();

        await rdb.ref(`users/${newUid}`).set({
          email: data.email || null,
          fullName: data.name || null,
          country: data.country || null,
          idNumber: data.idNumber || null,
          phoneNumber: data.phoneNumber || null,
          isPaid: true,
          paidAt: new Date().toISOString(),
          referralCode: referralCodeForNewUser,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        // Initialize wallet for new user
        await rdb.ref(`users/${newUid}/wallet`).set({
          taskBalance: 0,
          referralBalance: 0,
          totalEarnings: 0,
          updatedAt: new Date().toISOString(),
        });

        // Credit referral bonus if a referrer code was provided
        if (referrerCode) {
          try {
            const referralService = (await import('../services/referralService.js')).default;
            await referralService.creditReferralBonus(rdb, referrerCode, data.email);
          } catch (err) {
            console.error('Error crediting referrer:', err);
          }
        }
        await docRef.update({ status: 'COMPLETED', updatedAt: new Date().toISOString(), password: null, uid: newUid });
        await pendingUserRef?.update({ status: 'COMPLETED', updatedAt: new Date().toISOString(), uid: newUid });
      } catch (e) {
        console.warn('createUser during webhook failed, trying to update existing user', e?.message || e);
        const existing = await firebaseAdmin.auth().getUserByEmail(data.email);
        const existingUid = existing.uid;
        const referrerCode = data.referralCode || null;
        const referralCodeForExisting = await (async () => {
          try {
            return await (await import('../services/referralService.js')).default.generateUniqueReferralCode(rdb);
          } catch (e) {
            return `R${existingUid.slice(0,8)}`;
          }
        })();
        await rdb.ref(`users/${existingUid}`).update({
          fullName: data.name || null,
          country: data.country || null,
          idNumber: data.idNumber || null,
          phoneNumber: data.phoneNumber || null,
          isPaid: true,
          paidAt: new Date().toISOString(),
          referralCode: referralCodeForExisting,
          updatedAt: new Date().toISOString(),
        });
        
        // Ensure wallet exists for existing user
        const walletSnap = await rdb.ref(`users/${existingUid}/wallet`).get();
        if (!walletSnap.exists()) {
          await rdb.ref(`users/${existingUid}/wallet`).set({
            taskBalance: 0,
            referralBalance: 0,
            totalEarnings: 0,
            updatedAt: new Date().toISOString(),
          });
        }

        if (referrerCode) {
          try {
            const referralService = (await import('../services/referralService.js')).default;
            await referralService.creditReferralBonus(rdb, referrerCode, data.email);
          } catch (err) {
            console.error('Error crediting referrer for existing user path:', err);
          }
        }
        await docRef.update({ status: 'COMPLETED', updatedAt: new Date().toISOString(), password: null, uid: existingUid });
        await pendingUserRef?.update({ status: 'COMPLETED', updatedAt: new Date().toISOString(), uid: existingUid });
      }

      await docRef.remove();
      return;
    }
  }

  await docRef.update({ status: 'FAILED', updatedAt: new Date().toISOString(), password: null });
  if (pendingUserRef) {
    await pendingUserRef.update({ status: 'FAILED', updatedAt: new Date().toISOString() });
  }
}

async function approvePendingUserRegistration(pendingId, { force = false } = {}) {
  if (!pendingId) {
    throw new Error('pendingId_required');
  }

  const rdb = firebaseAdmin.database();
  const pendingSnap = await rdb.ref(`pendingUsers/${pendingId}`).get();
  if (!pendingSnap.exists()) {
    throw new Error('PENDING_USER_NOT_FOUND');
  }

  const data = pendingSnap.val();
  const status = data.status || 'PENDING';
  const paymentStatus = data.paymentStatus || (status === 'COMPLETED' ? 'COMPLETED' : null);
  const isManual = data.paymentMethod === 'manual' || data.provider === 'manual';
  const now = new Date().toISOString();
  let paymentCompleted = paymentStatus === 'COMPLETED' || status === 'COMPLETED' || !!data.paymentCompletedAt;
  if (force) {
    console.log(`[approvePendingUserRegistration] force approval enabled for pendingId=${pendingId} email=${data.email}`);
    paymentCompleted = true;
    data.paymentStatus = 'COMPLETED';
    data.status = 'COMPLETED';
    data.paymentCompletedAt = now;
  }

  if (!paymentCompleted && data.provider === 'pesapal' && data.orderTrackingId) {
    try {
      const { default: pesapalController } = await import('./pesapal.controller.js');
      const pesapalStatus = await pesapalController.getPesapalPaymentStatus(data.orderTrackingId);
      if (pesapalStatus?.status === 'COMPLETED') {
        paymentCompleted = true;
        await rdb.ref(`pendingPayments/${pendingId}`).update({
          status: 'COMPLETED',
          updatedAt: now,
        });
        await rdb.ref(`pendingUsers/${pendingId}`).update({
          status: 'COMPLETED',
          paymentStatus: 'COMPLETED',
          paymentCompletedAt: now,
          updatedAt: now,
        });
        console.log(`[approvePendingUserRegistration] Pesapal status confirmed completed for pendingId=${pendingId} orderTrackingId=${data.orderTrackingId}`);
      } else if (pesapalStatus?.status === 'FAILED') {
        await rdb.ref(`pendingPayments/${pendingId}`).update({
          status: 'FAILED',
          updatedAt: now,
        });
        await rdb.ref(`pendingUsers/${pendingId}`).update({
          status: 'FAILED',
          paymentStatus: 'FAILED',
          updatedAt: now,
        });
      }
    } catch (statusErr) {
      console.warn(`[approvePendingUserRegistration] failed to verify Pesapal status for pendingId=${pendingId}`, statusErr?.message || statusErr);
    }
  }

  if (!paymentCompleted && !isManual) {
    throw new Error('payment_not_completed');
  }

  if (data.status === 'COMPLETED' && data.uid) {
    await cleanupPendingApproval(pendingId);
    return { status: 'COMPLETED', uid: data.uid };
  }

  const email = data.email;
  if (!email) {
    throw new Error('pending_user_missing_email');
  }

  try {
    const result = await activatePendingRegistration({
      rdb,
      pendingId,
      pendingData: data,
      now,
      cleanupPendingApproval,
    });

    return result;
  } catch (err) {
    console.error('[approvePendingUserRegistration] error', err?.message || err);
    throw err;
  }
}

async function forceApprovePendingUserRegistration(pendingId) {
  return approvePendingUserRegistration(pendingId, { force: true });
}

async function mpesaWebhook(req, res) {
  try {
    const payload = req.body;
    const rdb = firebaseAdmin.database();

    const checkoutRequestId =
      payload?.checkoutRequestId ||
      payload?.CheckoutRequestID ||
      payload?.Result?.CheckoutRequestID ||
      payload?.Body?.stkCallback?.CheckoutRequestID;

    const resultCode =
      payload?.ResultCode ?? payload?.Body?.stkCallback?.ResultCode ?? payload?.resultCode;

    const status =
      payload?.status ||
      (typeof resultCode === 'number' ? (resultCode === 0 ? 'SUCCESS' : 'FAILED') : 'FAILED');

    if (payload?.uid && status === 'SUCCESS') {
      await rdb.ref(`users/${payload.uid}`).update({
        isPaid: true,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (checkoutRequestId) {
      const pending = await findPendingPaymentByCheckoutRequestId(checkoutRequestId);
      if (pending) {
        await processPendingPayment({ pendingKey: pending.key, data: pending.data, status });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('mpesaWebhook error', err);
    return res.status(500).json({ ok: false });
  }
}

async function simulateMpesaWebhook(req, res) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ ok: false, error: 'SIMULATION_DISABLED' });
    }

    const { pendingId, status = 'SUCCESS' } = req.body;
    if (!pendingId) {
      return res.status(400).json({ ok: false, error: 'pendingId_required' });
    }

    const pending = await findPendingPaymentByPendingId(pendingId);
    if (!pending) {
      return res.status(404).json({ ok: false, error: 'PENDING_NOT_FOUND' });
    }

    await processPendingPayment({ pendingKey: pending.key, data: pending.data, status });
    return res.json({ ok: true });
  } catch (err) {
    console.error('simulateMpesaWebhook error', err);
    return res.status(500).json({ ok: false, error: 'SIMULATION_FAILED' });
  }
}

async function bypassGuestPayment(req, res) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ ok: false, error: 'BYPASS_DISABLED' });
    }

    const { email, password, phoneNumber, name, country, idNumber } = req.body;
    if (!email || !password || !phoneNumber || !name || !country || !idNumber) {
      return res.status(400).json({ ok: false, error: 'missing_guest_registration_fields' });
    }

    const rdb = firebaseAdmin.database();
    let userRecord;

    try {
      userRecord = await firebaseAdmin.auth().createUser({ email, password, displayName: name || null });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        userRecord = await firebaseAdmin.auth().getUserByEmail(email);
      } else {
        throw err;
      }
    }

    const uid = userRecord.uid;
    await rdb.ref(`users/${uid}`).set({
      email,
      fullName: name,
      country,
      idNumber,
      phoneNumber,
      isPaid: true,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true, uid });
  } catch (err) {
    console.error('bypassGuestPayment error', err);
    return res.status(500).json({ ok: false, error: 'BYPASS_FAILED' });
  }
}

async function getPaymentStatus(req, res) {
  try {
    const { pendingId } = req.params;
    if (!pendingId) {
      return res.status(400).json({ ok: false, error: 'pendingId_required' });
    }

    const rdb = firebaseAdmin.database();
    const snap = await rdb.ref(`pendingUsers/${pendingId}`).get();
    if (!snap.exists()) {
      return res.status(404).json({ ok: false, error: 'PENDING_NOT_FOUND' });
    }

    const data = snap.val();
    return res.json({
      ok: true,
      status: data.status,
      email: data.email,
      phoneNumber: data.phoneNumber,
      name: data.name || null,
      country: data.country || null,
      idNumber: data.idNumber || null,
      checkoutRequestId: data.checkoutRequestId || null,
      uid: data.uid || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  } catch (err) {
    console.error('getPaymentStatus error', err);
    return res.status(500).json({ ok: false, error: 'STATUS_CHECK_FAILED' });
  }
}

async function getUserOrders(req, res) {
  try {
    const { uid } = req.user;
    const rdb = firebaseAdmin.database();

    const snap = await rdb.ref(`users/${uid}/orders`).get();
    const val = snap.exists() ? snap.val() : {};
    
    // Filter out orders older than 7 days and process remaining orders
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const updatedOrders = [];
    const ordersToDelete = [];
    
    for (const [id, data] of Object.entries(val || {})) {
      const orderTime = new Date(data.createdAt).getTime();
      
      // Mark orders older than 7 days for deletion
      if (orderTime < sevenDaysAgo.getTime()) {
        ordersToDelete.push(id);
        continue; // Skip adding to results
      }
      
      let order = { id, ...data };
      
      // Auto-verify if pending and 2 minutes have passed
      if (order.status === 'pending') {
        const createdTime = new Date(order.createdAt).getTime();
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - createdTime;
        
        if (elapsedTime >= VERIFICATION_TIME) {
          // Auto-verify the order
          await rdb.ref(`users/${uid}/orders/${id}`).update({
            status: 'verified',
            verifiedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          order.status = 'verified';
          order.verifiedAt = new Date().toISOString();
        }
      }
      
      updatedOrders.push(order);
    }
    
    // Delete orders older than 7 days from database
    for (const orderId of ordersToDelete) {
      await rdb.ref(`users/${uid}/orders/${orderId}`).remove();
    }
    
    const orders = updatedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ ok: true, orders });
  } catch (err) {
    console.error('getUserOrders error', err);
    return res.status(500).json({ ok: false, error: 'GET_ORDERS_FAILED' });
  }
}

export default { createStkPush, createStkPushGuest, createManualGuest, mpesaWebhook, simulateMpesaWebhook, bypassGuestPayment, getPaymentStatus, getUserOrders, placeOrder, approvePendingUserRegistration, forceApprovePendingUserRegistration };

