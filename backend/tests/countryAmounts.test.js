import {
  getActivationFeeForCountry,
  getReferralBonusForCountry,
  getCurrencyCodeForCountry,
  getTaskMinWithdrawalForCountry,
} from '../src/utils/countryAmounts.js';

describe('country currency helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.KENYA_ACTIVATION_FEE_KES = '200';
    process.env.KENYA_REFERRAL_BONUS_KES = '50';
    process.env.ZAMBIA_ACTIVATION_FEE_ZMW = '100';
    process.env.ZAMBIA_REFERRAL_BONUS_ZMW = '25';
    process.env.ZMW_TO_KES_RATE = '2';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses Kenyan pricing for Kenya and other countries', () => {
    expect(getActivationFeeForCountry('Kenya')).toEqual({ amount: 200, currency: 'KES' });
    expect(getReferralBonusForCountry('Kenya')).toEqual({ amount: 50, currency: 'KES' });
    expect(getActivationFeeForCountry('Uganda')).toEqual({ amount: 200, currency: 'KES' });
    expect(getCurrencyCodeForCountry('Uganda')).toBe('KES');
    expect(getTaskMinWithdrawalForCountry('Kenya')).toBe(1000);
  });

  it('uses ZMW pricing for Zambia', () => {
    expect(getActivationFeeForCountry('Zambia')).toEqual({ amount: 100, currency: 'ZMW' });
    expect(getReferralBonusForCountry('Zambia')).toEqual({ amount: 25, currency: 'ZMW' });
    expect(getCurrencyCodeForCountry('Zambia')).toBe('ZMW');
    expect(getTaskMinWithdrawalForCountry('Zambia')).toBe(980);
  });
});
