# Withdrawal Gating by Active Referrals - Test Scenarios

## System Rules
- Every 20 active referrals = KES 100 referral withdrawal capacity OR 1 full task balance withdrawal
- After withdrawal approval, referral counter resets (referralsUsedInWithdrawals incremented)
- Next withdrawal requires 20 NEW active referrals

## Test Scenario 1: Basic Referral Withdrawal
**Setup:**
- User A: 20 active referrals, KES 200 referral balance
- referralsUsedInWithdrawals: 0
- availableReferrals: 20 - 0 = 20

**Test:** Request KES 100 referral withdrawal
- Calculation: referralsNeeded = Math.ceil(100/100) * 20 = 20
- Expected: ✅ APPROVED (has 20 available)
- After approval: referralsUsedInWithdrawals = 20

**Test:** Request another KES 100 withdrawal
- New calculation: availableReferrals = 20 - 20 = 0
- referralsNeeded: 20
- Expected: ❌ REJECTED (has 0 available, needs 20)

---

## Test Scenario 2: Multiple Withdrawal Cycles
**Setup:**
- User B: 40 active referrals, KES 300 referral balance
- referralsUsedInWithdrawals: 0
- availableReferrals: 40

**Test 1:** Request KES 100 referral withdrawal
- Expected: ✅ APPROVED
- After: referralsUsedInWithdrawals = 20, availableReferrals = 20

**Test 2:** Request KES 100 referral withdrawal again (same cycle)
- availableReferrals: 40 - 20 = 20
- referralsNeeded: 20
- Expected: ✅ APPROVED
- After: referralsUsedInWithdrawals = 40, availableReferrals = 0

**Test 3:** Request KES 100 again (3rd cycle)
- availableReferrals: 40 - 40 = 0
- Expected: ❌ REJECTED (need 20 NEW referrals)

---

## Test Scenario 3: Task Withdrawal Gating
**Setup:**
- User C: 20 active referrals, KES 2000 task balance
- referralsUsedInWithdrawals: 0

**Test:** Request KES 2000 task withdrawal
- Validation: availableReferrals = 20 >= 20 (need 20 for task)
- Expected: ✅ APPROVED
- After: referralsUsedInWithdrawals = 20

**Next cycle:** 3 users activate (now 23 total active)
- availableReferrals = 23 - 20 = 3
- Can't withdraw (needs 20)
- Need 17 more users to activate

---

## Test Scenario 4: Large Referral Withdrawal
**Setup:**
- User D: 50 active referrals, KES 500 referral balance
- referralsUsedInWithdrawals: 0

**Test 1:** Request KES 200 referral withdrawal
- referralsNeeded = Math.ceil(200/100) * 20 = 40
- availableReferrals = 50
- Expected: ✅ APPROVED
- After: referralsUsedInWithdrawals = 40, availableReferrals = 10

**Test 2:** Request KES 100
- referralsNeeded = 20
- availableReferrals = 50 - 40 = 10
- Expected: ❌ REJECTED (needs 20, has 10)

---

## Test Scenario 5: Rejection Refund
**Setup:**
- User E: 20 active, KES 100 referral balance
- Submits KES 100 withdrawal (approved and balance deducted)

**When:** Admin rejects withdrawal
- Expected: Balance restored to KES 100
- referralsUsedInWithdrawals: NOT incremented (only on approval)

---

## API Response Examples

### Success: Referral Withdrawal Request
```json
{
  "ok": true,
  "withdrawalId": "w123",
  "message": "Withdrawal request created"
}
```

### Error: Insufficient Active Referrals
```json
{
  "ok": false,
  "error": "REFERRAL_WITHDRAWAL_LIMIT",
  "message": "You need 20 active referrals to withdraw KES 100. You have 10 available. (20 active referrals = KES 100)"
}
```

### Error: Task Withdrawal - Insufficient Referrals
```json
{
  "ok": false,
  "error": "TASK_WITHDRAWAL_REQUIRES_ACTIVE_REFERRALS",
  "message": "You need at least 20 active referrals available for task withdrawal. You have 5 available."
}
```

### Wallet Response (getWallet)
```json
{
  "ok": true,
  "wallet": {
    "taskBalance": 1000,
    "referralBalance": 150,
    "totalEarnings": 1150,
    "referralsUsedInWithdrawals": 20,
    "referralStats": {
      "totalReferred": 30,
      "activeReferred": 30,
      "availableReferrals": 10,
      "maxReferralWithdrawal": 100
    }
  }
}
```

---

## Frontend Display Logic

### Show Available Referrals
```javascript
const availableReferrals = referralStats.availableReferrals;
const referralsNeeded = 20 - availableReferrals;

if (availableReferrals >= 20) {
  // Can withdraw KES 100
  showWithdrawButton = true;
} else {
  // Show "Need X more referrals"
  message = `You need ${referralsNeeded} more active referrals to withdraw`;
}
```

### Withdrawal Capacity
```javascript
// How many KES can user withdraw from referrals?
const maxReferralAmount = Math.floor(availableReferrals / 20) * 100;
// If availableReferrals = 30: can withdraw up to KES 100 (1 × 100)
// If availableReferrals = 50: can withdraw up to KES 200 (2 × 100)
```

---

## Testing Checklist

### Backend Tests
- [ ] getReferralStats() returns correct availableReferrals
- [ ] requestWithdrawal() blocks when insufficient referrals
- [ ] requestWithdrawal() accepts when sufficient referrals
- [ ] approveWithdrawal() increments referralsUsedInWithdrawals
- [ ] updateWithdrawal() with rejection doesn't increment counter
- [ ] getWallet() returns correct referralStats

### Frontend Tests
- [ ] Display shows correct available referrals
- [ ] Withdrawal button disabled when insufficient referrals
- [ ] Message shows "Need X more referrals" when blocked
- [ ] After withdrawal, availableReferrals updates correctly

### Integration Tests
- [ ] User A: 20 referrals → withdraw KES 100 → counter resets
- [ ] User B: 40 referrals → 2 × KES 100 withdrawals → counter resets
- [ ] User C: 15 referrals → withdrawal blocked → gets 5 more → still blocked
- [ ] User D: 20 referrals → task withdrawal accepted → counter resets
