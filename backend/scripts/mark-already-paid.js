#!/usr/bin/env node
import firebaseAdmin from '../src/services/firebaseAdmin.js';
import fs from 'fs';

// One-off admin script to mark existing users as paid/activated
// Usage:
//  - Dry run (default): `node backend/scripts/mark-already-paid.js`
//  - Apply updates: `node backend/scripts/mark-already-paid.js --apply`
//  - Save CSV of matches: `--out=matches.csv`

const PAID_AMOUNT = 200;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { apply: false, out: null };
  for (const a of args) {
    if (a === '--apply' || a === '-a') opts.apply = true;
    if (a.startsWith('--out=')) opts.out = a.split('=')[1];
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  try {
    const rdb = firebaseAdmin.database();
    const usersSnap = await rdb.ref('users').get();
    if (!usersSnap.exists()) {
      console.log('No users found');
      process.exit(0);
    }

    const users = usersSnap.val();
    const matches = [];

    for (const [uid, data] of Object.entries(users)) {
      try {
        if (data?.isPaid) continue; // already paid

        const hasPaidFlag = data?.paidAt || data?.paymentCompletedAt || data?.paymentCompleted;
        if (hasPaidFlag) {
          matches.push({ uid, reason: 'paid_flag', paidAt: data.paidAt || data.paymentCompletedAt || new Date().toISOString() });
          continue;
        }

        // check orders
        const ordersSnap = await rdb.ref(`users/${uid}/orders`).get();
        if (ordersSnap.exists()) {
          const orders = ordersSnap.val();
          for (const [oid, order] of Object.entries(orders || {})) {
            const amount = Number(order.amount || 0);
            const status = String(order.status || '').toLowerCase();
            if (amount >= PAID_AMOUNT && ['verified', 'paid', 'completed', 'success'].includes(status)) {
              matches.push({ uid, reason: `order:${oid}`, paidAt: order.verifiedAt || order.updatedAt || order.createdAt || new Date().toISOString() });
              break;
            }
          }
        }
      } catch (e) {
        console.error('error checking user', uid, e?.message || e);
      }
    }

    if (matches.length === 0) {
      console.log('No users matched the paid criteria. Nothing to update.');
      process.exit(0);
    }

    console.log(`Found ${matches.length} users to mark as paid.`);

    if (opts.out) {
      try {
        const csv = ['uid,reason,paidAt'].concat(matches.map(m => `${m.uid},${m.reason},${m.paidAt}`)).join('\n');
        fs.writeFileSync(opts.out, csv, 'utf8');
        console.log(`Wrote matches CSV to ${opts.out}`);
      } catch (e) {
        console.error('Failed to write CSV', e?.message || e);
      }
    }

    if (!opts.apply) {
      console.log('Dry run mode — no changes applied. Rerun with --apply to apply updates.');
      matches.slice(0, 100).forEach(m => console.log(`- ${m.uid} (${m.reason}) at ${m.paidAt}`));
      process.exit(0);
    }

    console.log('Applying updates now...');
    for (const u of matches) {
      try {
        const now = u.paidAt || new Date().toISOString();
        await rdb.ref(`users/${u.uid}`).update({ isPaid: true, paidAt: now, updatedAt: new Date().toISOString() });
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
