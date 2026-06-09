import referralService from '../src/services/referralService.js';

function getNested(obj, path) {
  const parts = path.split('/').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setNested(obj, path, val) {
  const parts = path.split('/').filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i === parts.length - 1) {
      cur[p] = val;
    } else {
      cur[p] = cur[p] || {};
      cur = cur[p];
    }
  }
}

class MockSnap {
  constructor(v) { this._v = v; }
  exists() { return this._v !== undefined && Object.keys(this._v).length > 0; }
  val() { return this._v; }
}

class MockRef {
  constructor(db, path) { this.db = db; this.path = path; this._equal = undefined; }
  orderByChild() { return this; }
  equalTo(v) { this._equal = v; return this; }
  limitToFirst() { return this; }
  async get() {
    if (this.path === 'users' && this._equal !== undefined) {
      const hits = {};
      for (const [uid, u] of Object.entries(this.db.users || {})) {
        if (u && u.referralCode === this._equal) hits[uid] = u;
      }
      return new MockSnap(Object.keys(hits).length ? hits : {});
    }
    const val = getNested(this.db, this.path);
    return new MockSnap(val || {});
  }
  push() {
    const key = 'k' + Math.random().toString(36).slice(2, 9);
    return {
      key,
      set: async (v) => setNested(this.db, `${this.path}/${key}`, v),
    };
  }
  async set(v) { setNested(this.db, this.path, v); }
  async update(obj) {
    const cur = getNested(this.db, this.path) || {};
    setNested(this.db, this.path, { ...cur, ...obj });
  }
}

class MockRdb {
  constructor(state = {}) { this.state = state; }
  ref(path) { return new MockRef(this.state, path); }
}

async function testGenerateUnique() {
  const db = new MockRdb({ users: { u1: { referralCode: 'ABC123' }, u2: { referralCode: 'XYZ789' } } });
  const code = await referralService.generateUniqueReferralCode(db, 4, 4);
  if (!code || typeof code !== 'string') throw new Error('Invalid code');
  if (code === 'ABC123' || code === 'XYZ789') throw new Error('Generated code collided');
  console.log('generateUniqueReferralCode =>', code);
}

async function testCreditReferral() {
  const dbState = {
    users: {
      referrer: { referralCode: 'REF123' },
    },
  };
  const db = new MockRdb(dbState);
  const res = await referralService.creditReferralBonus(db, 'REF123', 'newuser@example.com', 50);
  if (!res || res.refUid !== 'referrer') throw new Error('Did not credit expected referrer');
  const wallet = getNested(dbState, 'users/referrer/wallet');
  if (!wallet) throw new Error('Wallet missing');
  if (wallet.referralBalance !== 50) throw new Error('Referral balance incorrect');
  const txs = getNested(dbState, 'users/referrer/wallet/transactions');
  if (!txs || Object.keys(txs).length !== 1) throw new Error('Transaction not recorded');
  const notifs = getNested(dbState, 'users/referrer/notifications');
  if (!notifs || Object.keys(notifs).length !== 1) throw new Error('Notification not recorded');
  console.log('creditReferralBonus => success');
}

(async () => {
  try {
    await testGenerateUnique();
    await testCreditReferral();
    console.log('All referral service tests passed');
    console.log('You can also run the Jest suite with `npm test` after installing dev dependencies.');
    process.exit(0);
  } catch (err) {
    console.error('Referral service tests failed:', err);
    process.exit(2);
  }
})();
