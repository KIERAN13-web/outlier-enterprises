#!/usr/bin/env node
import firebaseAdmin from '../src/services/firebaseAdmin.js';

// One-off admin script to mark existing users as paid/activated
// Criteria used (best-effort):
// - user.paidAt or user.paymentCompletedAt exists
// - OR any order in users/{uid}/orders with amount >= 200 and status indicating success

const PAID_AMOUNT = 200;

async function main() {
  try {
    const rdb = firebaseAdmin.database();
    const usersSnap = await rdb.ref('users').get();
    if (!usersSnap.exists()) {
      console.log('No users found');
      process.exit(0);
    }

    const users = usersSnap.val();
    const updates = [];

    for (const [uid, data] of Object.entries(users)) {
      try {
        // skip already paid
        if (data?.isPaid) continue;

        const hasPaidFlag = data?.paidAt || data?.paymentCompletedAt || data?.paymentCompleted;
        if (hasPaidFlag) {
          updates.push({ uid, reason: 'paid_flag', paidAt: data.paidAt || data.paymentCompletedAt || new Date().toISOString() });
          continue;
        }

        // check orders
        const ordersSnap = await rdb.ref(`users/${uid}/orders`).get();
        if (ordersSnap.exists()) {
          const orders = ordersSnap.val();
          for (const [oid, order] of Object.entries(orders || {})) {
            const amount = Number(order.amount || 0);
            const status = String(order.status || '').toLowerCase();
            if (amount >= PAID_AMOUNT && (status === 'verified' || status === 'verified' || status === 'paid' || status === 'completed' || status === 'success')) {
              updates.push({ uid, reason: `order:${oid}`, paidAt: order.verifiedAt || order.updatedAt || order.createdAt || new Date().toISOString() });
              break;
            }
          }
        }
      } catch (e) {
        console.error('error checking user', uid, e?.message || e);
      }
    }

    if (updates.length === 0) {
      console.log('No users matched the paid criteria. Nothing to update.');
      process.exit(0);
    }

    console.log(`Found ${updates.length} users to mark as paid. Applying updates...`);

    for (const u of updates) {
      try {
        const now = u.paidAt || new Date().toISOString();
        await rdb.ref(`users/${u.uid}`).update({ isPaid: true, paidAt: now, updatedAt: new Date().toISOString() });
        // ensure wallet exists
        const walletSnap = await rdb.ref(`users/${u.uid}/wallet`).get();
        if (!walletSnap.exists()) {
          await rdb.ref(`users/${u.uid}/wallet`).set({ taskBalance: 0, referralBalance: 0, totalEarnings: 0, updatedAt: new Date().toISOString() });
        }
        console.log(`Marked paid: ${u.uid} (${u.reason})`);
      } catch (e) {
        console.error('failed to mark user paid', u.uid, e?.message || e);
      }
    }

    console.log('Completed updates.');
    process.exit(0);
  } catch (err) {
    console.error('mark-already-paid failed', err);
    process.exit(2);
  }
}

main();
