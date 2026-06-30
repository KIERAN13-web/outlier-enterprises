import referralService from '../src/services/referralService.js';

class MockRef {
  constructor(state, path) { this.state = state; this.path = path; }
  orderByChild() { return this; }
  equalTo(v) { this._equal = v; return this; }
  limitToFirst() { return this; }
  async get() {
    if (this.path === 'users' && this._equal) {
      const hits = {};
      for (const [uid, u] of Object.entries(this.state.users || {})) {
        if (u && u.referralCode === this._equal) hits[uid] = u;
      }
      return { exists: () => Object.keys(hits).length > 0, val: () => hits };
    }
    const parts = this.path.split('/').filter(Boolean);
    let cur = this.state;
    for (const p of parts) { cur = cur?.[p]; if (cur === undefined) break; }
    return { exists: () => cur !== undefined && Object.keys(cur || {}).length > 0, val: () => cur };
  }
  push() { const k = 'k'+Math.random().toString(36).slice(2,8); return { key: k, set: async (v) => { const parts=this.path.split('/').filter(Boolean); let cur=this.state; for(let i=0;i<parts.length;i++){ const p=parts[i]; if(i===parts.length-1){ cur[p]=cur[p]||{}; cur[p][k]=v; } else { cur[p]=cur[p]||{}; cur=cur[p]; } } } };
  }
  async set(v){ const parts=this.path.split('/').filter(Boolean); let cur=this.state; for(let i=0;i<parts.length;i++){ const p=parts[i]; if(i===parts.length-1){ cur[p]=v; } else { cur[p]=cur[p]||{}; cur=cur[p]; } } }
  async update(obj){ const parts=this.path.split('/').filter(Boolean); let cur=this.state; for(let i=0;i<parts.length;i++){ const p=parts[i]; if(i===parts.length-1){ cur[p]= {...(cur[p]||{}), ...obj }; } else { cur[p]=cur[p]||{}; cur=cur[p]; } } }
}
class MockRdb { constructor(state={}){ this.state=state;} ref(path){ return new MockRef(this.state, path); } }

test('generateUniqueReferralCode returns non-colliding code', async () => {
  const db = new MockRdb({ users: { u1: { referralCode: 'ABC1' }, u2: { referralCode: 'XYZ9' } } });
  const code = await referralService.generateUniqueReferralCode(db, 4, 5);
  expect(typeof code).toBe('string');
  expect(code).not.toBe('ABC1');
  expect(code).not.toBe('XYZ9');
});

test('creditReferralBonus credits wallet and creates notification', async () => {
  const state = { users: { referrer: { referralCode: 'REF123' } } };
  const rdb = new MockRdb(state);
  const res = await referralService.creditReferralBonus(rdb, 'REF123', 'new@example.com', 50);
  expect(res).not.toBeNull();
  expect(res.refUid).toBe('referrer');
  const wallet = state.users.referrer.wallet;
  expect(wallet.referralBalance).toBe(50);
  expect(wallet.availableBalance).toBe(50);
  expect(wallet.totalEarnings).toBe(50);
  expect(Object.keys(wallet.transactions || {}).length).toBe(1);
  expect(Object.keys(state.users.referrer.notifications || {}).length).toBe(1);
});

test('getReferralStats counts total, pending, and active referrals from users and pendingUsers', async () => {
  const state = {
    users: {
      referrer: { referralCode: 'REF123' },
      one: { referredByCode: 'REF123', isPaid: false },
      two: { referredByCode: 'REF123', isPaid: true },
      three: { referredByCode: 'OTHER', isPaid: true },
    },
    pendingUsers: {
      p1: { referralCode: 'REF123', status: 'PENDING' },
      p2: { referralCode: 'REF123', status: 'COMPLETED' },
      p3: { referralCode: 'OTHER', status: 'PENDING' },
    },
  };
  const rdb = new MockRdb(state);
  const stats = await referralService.getReferralStats(rdb, 'REF123');
  expect(stats.totalReferred).toBe(3);
  expect(stats.pendingReferred).toBe(2);
  expect(stats.activeReferred).toBe(1);
  expect(stats.maxReferralWithdrawal).toBe(50);
});
