# TODO.md

## Zambia/Kenya country-based activation + referral amounts (ZMW -> KES conversion)

- [ ] Inspect remaining payment/registration code paths to find where activation fee is computed/charged
- [ ] Add backend helper for country-based config and ZMW→KES conversion
- [ ] Update activation fee used in Pesapal (and MPesa if applicable) based on pending/user country
- [ ] Update referralService: creditReferralBonus reward depends on referrer country (Zambia=25 ZMW converted, Kenya=50 KES)
- [ ] Update referralService: getReferralStats maxReferralWithdrawal depends on referrer country (50 replaced with country-derived bonus)
- [ ] Keep withdrawal/referral withdrawal gating logic unchanged
- [ ] Update env var docs / defaults
- [ ] Run backend tests

