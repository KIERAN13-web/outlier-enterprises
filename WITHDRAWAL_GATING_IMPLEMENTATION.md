# Withdrawal Gating by Active Referrals - Implementation Summary

## Overview
Implemented a referral-gated withdrawal system where users need active referrals to unlock withdrawal capacity. Every 20 active referrals = KES 100 referral withdrawal OR 1 full task balance withdrawal.

## Business Logic

### Withdrawal Rules

#### Referral Withdrawal
- **Requirement:** 20 active referrals = KES 100 withdrawal capacity
- **Calculation:** `referralsNeeded = Math.ceil(amount / 100) * 20`
- **Example 1:** KES 100 withdrawal requires 20 active referrals
- **Example 2:** KES 200 withdrawal requires 40 active referrals
- **After withdrawal:** Referral counter resets (20 referrals marked as "used")

#### Task Withdrawal  
- **Requirement:** 20 active referrals = 1 full task balance withdrawal
- **Example 1:** Task balance of KES 1000 requires 20 active referrals
- **Example 2:** Task balance of KES 2000 requires 40 active referrals (2 × 20)
- **After withdrawal:** Referral counter resets (20 referrals marked as "used")

### How It Works

1. **Active Referrals Calculation**
   ```
   activeReferred = count of users referred who have paid (isPaid: true)
   referralsUsedInWithdrawals = cumulative count of referrals used in approvals
   availableReferrals = activeReferred - referralsUsedInWithdrawals
   maxReferralWithdrawal = Math.floor(availableReferrals / 20) * 100
   ```

2. **Withdrawal Request Validation**
   - Get user's `referralsUsedInWithdrawals` from wallet
   - Calculate `availableReferrals = activeReferred - referralsUsedInWithdrawals`
   - Check: `availableReferrals >= referralsNeeded`
   - If insufficient: Reject with error message showing gap

3. **Withdrawal Approval**
   - On approval, increment `referralsUsedInWithdrawals` by referrals used
   - For task: add 20
   - For referral: add (amount/100)*20
   - Balance is already deducted at request time

4. **Reset Mechanism**
   - No automatic reset; instead, tracking "used" referrals
   - User gains new active referrals → availableReferrals increases
   - Can then make another withdrawal

## Database Schema Changes

### Wallet Document
```
users/{uid}/wallet/
├── taskBalance: number
├── referralBalance: number
├── totalEarnings: number
├── availableBalance: number
├── referralsUsedInWithdrawals: number  [NEW]
├── withdrawals: {}
├── transactions: {}
└── updatedAt: timestamp
```

## API Changes

### GET /wallet (getWallet)
**Request:** No change
**Response additions:**
```json
{
  "wallet": {
    "referralsUsedInWithdrawals": 20,
    "referralStats": {
      "totalReferred": 30,
      "activeReferred": 30,
      "availableReferrals": 10,  // NEW: available for next withdrawal
      "maxReferralWithdrawal": 100
    }
  }
}
```

### POST /withdrawal/request (requestWithdrawal)
**Changes:**
- Now validates: `availableReferrals >= referralsNeeded`
- Error if insufficient: Shows required vs available referrals
- Different calculation for referral vs task withdrawals

**Example Error Response:**
```json
{
  "ok": false,
  "error": "REFERRAL_WITHDRAWAL_LIMIT",
  "message": "You need 20 active referrals to withdraw KES 100. You have 10 available. (20 active referrals = KES 100)"
}
```

### POST /admin/withdrawal/:uid/:withdrawalId/approve (approveWithdrawal)
**Changes:**
- Now increments `referralsUsedInWithdrawals` in wallet
- Returns additional info in response:
```json
{
  "ok": true,
  "status": "approved",
  "referralsUsedForThisWithdrawal": 20,
  "totalReferralsUsedAfterApproval": 20
}
```

## Files Modified

### Backend

1. **backend/src/services/referralService.js**
   - Updated `getReferralStats(rdb, referralCode, referralsUsedInWithdrawals)`
   - Now returns `availableReferrals` and recalculated `maxReferralWithdrawal`

2. **backend/src/controllers/wallet.controller.js**
   - Updated `getWallet()`: passes `referralsUsedInWithdrawals` to `getReferralStats`
   - Updated `requestWithdrawal()`: 
     - Calculates required referrals based on amount and type
     - Validates against available referrals
     - Different error for task vs referral withdrawals

3. **backend/src/controllers/admin.controller.js**
   - Updated `updateWithdrawal()`: increments counter on approval
   - Updated `approveWithdrawal()`: increments counter on approval

4. **backend/src/controllers/payment.controller.js**
   - Added `referralsUsedInWithdrawals: 0` to wallet initialization (2 locations)

5. **backend/src/utils/paymentStatus.js**
   - Added `referralsUsedInWithdrawals: 0` to wallet initialization

### Frontend

1. **frontend/src/pages/Register.jsx**
   - Added `referralsUsedInWithdrawals: 0` to wallet initialization

## Code Examples

### Calculate Available Referrals
```javascript
const availableReferrals = Math.max(0, activeReferred - referralsUsedInWithdrawals);
const maxReferralWithdrawal = Math.floor(availableReferrals / 20) * 100;
```

### Validate Task Withdrawal
```javascript
if (earningType === 'task' && referralStats.availableReferrals < 20) {
  return res.status(400).json({
    error: 'TASK_WITHDRAWAL_REQUIRES_ACTIVE_REFERRALS',
    message: `You need at least 20 active referrals available. You have ${referralStats.availableReferrals} available.`
  });
}
```

### Validate Referral Withdrawal
```javascript
const referralsNeeded = Math.ceil(parsedAmount / 100) * 20;
if (referralStats.availableReferrals < referralsNeeded) {
  return res.status(400).json({
    error: 'REFERRAL_WITHDRAWAL_LIMIT',
    message: `You need ${referralsNeeded} active referrals to withdraw KES ${parsedAmount}. You have ${referralStats.availableReferrals} available.`
  });
}
```

### Mark Referrals as Used (On Approval)
```javascript
let referralsUsedForThisWithdrawal = 0;
if (withdrawal.earningType === 'task') {
  referralsUsedForThisWithdrawal = 20;
} else if (withdrawal.earningType === 'referral') {
  referralsUsedForThisWithdrawal = Math.ceil(withdrawal.amount / 100) * 20;
}

const currentUsedReferrals = Number(wallet.referralsUsedInWithdrawals || 0);
await rdb.ref(`users/${uid}/wallet`).update({
  referralsUsedInWithdrawals: currentUsedReferrals + referralsUsedForThisWithdrawal
});
```

## Testing Scenarios

### Scenario 1: Basic Referral Withdrawal
1. User has 20 active referrals, KES 200 referral balance
2. Requests KES 100 withdrawal → ✅ APPROVED
3. After approval: `referralsUsedInWithdrawals = 20`
4. Requests another KES 100 → ❌ REJECTED (needs 20, has 0 available)

### Scenario 2: Multiple Cycles
1. User has 40 active referrals
2. Approves KES 100 × 2 (uses 40 referrals)
3. Gets 20 NEW active referrals (now 60 total)
4. Can approve another KES 100 (now has 20 available again)

### Scenario 3: Task Withdrawal Gating
1. User has 20 active referrals, KES 2000 task balance
2. Requests KES 2000 → ✅ APPROVED (has 20 available)
3. After approval: `referralsUsedInWithdrawals = 20`
4. Needs 20 NEW referrals to withdraw again

## Deployment Notes

1. **Database Migration:** Not needed (new field defaults to 0)
2. **Backward Compatibility:** Old wallets will default `referralsUsedInWithdrawals` to 0
3. **Testing:** See WITHDRAWAL_GATING_TEST.md for test scenarios
4. **Monitoring:** Track withdrawal rejection rate to identify referral bottlenecks

## Future Enhancements

- Dashboard widget: "Need X more referrals to unlock next withdrawal"
- Admin tool: View which referrals are "used" vs "available"
- Leaderboard: Sort by active referrals available for withdrawal
- Notification: Alert when user gains referrals enough for withdrawal
