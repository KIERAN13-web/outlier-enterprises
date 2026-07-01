# Referral-Gated Withdrawal System - REVISED IMPLEMENTATION

## Summary of Changes

Changed from a cumulative "referrals used" tracking model to a **baseline-reset** model where only NEW active referrals since the last withdrawal count toward the maximum.

---

## Referral Withdrawal Logic (CHANGED)

### Formula
```
newActiveReferrals = totalActiveReferred - activeReferralsAtLastWithdrawal
maxReferralWithdrawal = newActiveReferrals × 50
```

### How It Works

1. **First Withdrawal**
   - User has 2 active referrals
   - `activeReferralsAtLastWithdrawal = 0` (initial)
   - `newActiveReferrals = 2 - 0 = 2`
   - `maxReferralWithdrawal = 2 × 50 = 100`
   - Can withdraw up to KES 100 ✅

2. **Withdrawal Approved**
   - System sets: `activeReferralsAtLastWithdrawal = 2` (snapshot current active count)
   - User withdraws KES 100 or less
   - Maximum reset to 0 until new referrals activate

3. **New Referral Activates**
   - User now has 3 active referrals (1 new)
   - `newActiveReferrals = 3 - 2 = 1`
   - `maxReferralWithdrawal = 1 × 50 = 50`
   - Can withdraw up to KES 50 ✅

4. **More Referrals Activate**
   - User now has 4 active referrals (2 new)
   - `newActiveReferrals = 4 - 2 = 2`
   - `maxReferralWithdrawal = 2 × 50 = 100`
   - Can withdraw up to KES 100 again ✅

---

## Task Withdrawal Logic (UNCHANGED)

- Requires: **20 active referrals minimum**
- Approves: User can withdraw full `taskBalance`
- On approval: **No special baseline tracking** (task withdrawals don't affect referral baseline)
- After withdrawal: User needs 20 active referrals for NEXT task withdrawal

**Note:** Task and referral withdrawals are independent. A task withdrawal approval doesn't reset the referral baseline.

---

## Database Schema

### Wallet Document
```json
{
  "taskBalance": 1000,
  "referralBalance": 500,
  "totalEarnings": 1500,
  "availableBalance": 1500,
  "activeReferralsAtLastWithdrawal": 2,  // Baseline snapshot
  "withdrawals": {},
  "transactions": {},
  "updatedAt": "2026-06-30T10:00:00Z"
}
```

### Referral Stats
```json
{
  "totalReferred": 5,
  "pendingReferred": 1,
  "activeReferred": 4,
  "newActiveReferrals": 2,              // activeReferred - baseline
  "maxReferralWithdrawal": 100          // newActiveReferrals × 50
}
```

---

## API Validation Rules

### Referral Withdrawal Request
```
Validation: amount <= maxReferralWithdrawal
Calculation: maxReferralWithdrawal = (activeReferred - activeReferralsAtLastWithdrawal) × 50

Example 1: User requests KES 100
- Has 4 active, baseline = 2
- newActiveReferrals = 4 - 2 = 2
- maxReferralWithdrawal = 2 × 50 = 100
- 100 <= 100 ✅ APPROVED

Example 2: User requests KES 150
- Has 4 active, baseline = 2
- newActiveReferrals = 4 - 2 = 2
- maxReferralWithdrawal = 2 × 50 = 100
- 150 <= 100 ❌ REJECTED
```

### Task Withdrawal Request
```
Validation: activeReferred >= 20 (unchanged)

Example: User requests task withdrawal
- Has 20 active referrals
- 20 >= 20 ✅ APPROVED
```

---

## Approval Process

### On Referral Withdrawal Approval
1. Admin approves withdrawal
2. System fetches `current activeReferred` count
3. Sets `activeReferralsAtLastWithdrawal = currentActiveReferred`
4. User's new baseline is locked
5. Next withdrawal only counts referrals after this baseline

### On Task Withdrawal Approval
1. Admin approves withdrawal
2. **No baseline update**
3. User needs 20 active referrals for next task withdrawal

### On Rejection
1. Balance is refunded
2. **Baseline is NOT updated**
3. No change to `activeReferralsAtLastWithdrawal`

---

## Example Scenarios

### Scenario 1: Complete Referral Cycle
```
Day 1: User registers, gets 2 referrals who activate
  - activeReferred = 2
  - activeReferralsAtLastWithdrawal = 0 (initial)
  - newActiveReferrals = 2
  - maxReferralWithdrawal = 100
  - Withdraws KES 100 ✅

  After approval: activeReferralsAtLastWithdrawal = 2

Day 5: 3 more referrals activate
  - activeReferred = 5
  - activeReferralsAtLastWithdrawal = 2 (baseline)
  - newActiveReferrals = 5 - 2 = 3
  - maxReferralWithdrawal = 150
  - Requests KES 150 ✅ APPROVED

  After approval: activeReferralsAtLastWithdrawal = 5

Day 10: 2 more referrals activate
  - activeReferred = 7
  - activeReferralsAtLastWithdrawal = 5 (baseline)
  - newActiveReferrals = 7 - 5 = 2
  - maxReferralWithdrawal = 100
  - Requests KES 200 ❌ REJECTED (can only withdraw KES 100)
  - Requests KES 100 ✅ APPROVED
```

### Scenario 2: Mixed Withdrawals
```
User has 20 active referrals, KES 2000 task balance, KES 500 referral balance

Withdraws KES 2000 (task): ✅ APPROVED
  - activeReferralsAtLastWithdrawal stays 0 (no update for task)

Can still withdraw referrals:
  - newActiveReferrals = 20 - 0 = 20
  - maxReferralWithdrawal = 1000
  - Requests KES 500 ✅ APPROVED

After referral withdrawal: activeReferralsAtLastWithdrawal = 20

Next task withdrawal: needs 20 active referrals ✅ (still has them)
```

---

## Error Messages

### Insufficient Referrals (Referral Withdrawal)
```
{
  "ok": false,
  "error": "REFERRAL_WITHDRAWAL_LIMIT",
  "message": "You can withdraw at most KES 50 from referral earnings. (1 new active referrals × KES 50)"
}
```

### Insufficient Referrals (Task Withdrawal)
```
{
  "ok": false,
  "error": "TASK_WITHDRAWAL_REQUIRES_ACTIVE_REFERRALS",
  "message": "You need at least 20 active referrals for task withdrawal. You have 15 active."
}
```

---

## Implementation Details

### Files Modified

1. **backend/src/services/referralService.js**
   - `getReferralStats(rdb, referralCode, activeReferralsAtLastWithdrawal)`
   - Returns `newActiveReferrals = activeReferred - activeReferralsAtLastWithdrawal`
   - Returns `maxReferralWithdrawal = newActiveReferrals * 50`

2. **backend/src/controllers/wallet.controller.js**
   - `getWallet()`: Passes `activeReferralsAtLastWithdrawal` to `getReferralStats()`
   - `requestWithdrawal()`: 
     - For referral: validates `amount <= maxReferralWithdrawal`
     - For task: validates `activeReferred >= 20`

3. **backend/src/controllers/admin.controller.js**
   - `updateWithdrawal()`: On approval for referral type, resets `activeReferralsAtLastWithdrawal = currentActiveReferred`
   - `approveWithdrawal()`: Same logic as `updateWithdrawal()`

4. **Wallet Initialization (4 places)**
   - `backend/src/controllers/payment.controller.js` (2 locations)
   - `backend/src/utils/paymentStatus.js`
   - `frontend/src/pages/Register.jsx`
   - All set: `activeReferralsAtLastWithdrawal: 0`

---

## Testing Checklist

### Backend
- [ ] `getReferralStats()` calculates `newActiveReferrals` correctly
- [ ] `requestWithdrawal()` blocks when `amount > maxReferralWithdrawal`
- [ ] `requestWithdrawal()` blocks task when `activeReferred < 20`
- [ ] `approveWithdrawal()` (referral type) updates baseline to current active count
- [ ] `updateWithdrawal()` rejection doesn't update baseline
- [ ] `getWallet()` returns correct referral stats

### Frontend
- [ ] Display shows maximum withdrawal capacity
- [ ] Withdrawal button disabled when insufficient capacity
- [ ] Message shows required vs. available referrals

### Integration
- [ ] User with 2 active: withdraw KES 100, baseline resets
- [ ] 2 new activate: can withdraw KES 100 again
- [ ] Task withdrawal doesn't affect referral baseline
- [ ] Rejection restores balance and doesn't change baseline

---

## Migration Notes

- **No database migration needed**: Field defaults to 0 for existing users
- **Backward compatible**: Old `referralsUsedInWithdrawals` field is not used but can remain in DB
- **Reset on deployment**: All users start with `activeReferralsAtLastWithdrawal: 0`, allowing withdrawal based on current active count

---

## Key Differences from Previous Implementation

| Aspect | Old | New |
|--------|-----|-----|
| Referral ratio | 20 active = KES 100 | 1 active = KES 50 |
| Tracking | Cumulative used referrals | Baseline snapshots |
| Reset mechanism | Increment used counter | Reset baseline to current |
| Next withdrawal | Blocked until NEW referrals activate | Counts only NEW since baseline |
| Task impact | Affects referral counter | No interaction |

