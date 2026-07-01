function getCountry(configCountry) {
  return String(configCountry || '').trim().toLowerCase();
}

function roundTo2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getCurrencyCodeForCountry(country) {
  const c = getCountry(country);
  return c === 'zambia' ? 'ZMW' : 'KES';
}

function getActivationFeeForCountry(country) {
  const c = getCountry(country);

  if (c === 'zambia') {
    const amount = Number(process.env.ZAMBIA_ACTIVATION_FEE_ZMW) || 100;
    return { amount: roundTo2(amount), currency: 'ZMW' };
  }

  const amount = Number(process.env.KENYA_ACTIVATION_FEE_KES) || 200;
  return { amount: roundTo2(amount), currency: 'KES' };
}

function getReferralBonusForCountry(country) {
  const c = getCountry(country);

  if (c === 'zambia') {
    const amount = Number(process.env.ZAMBIA_REFERRAL_BONUS_ZMW) || 25;
    return { amount: roundTo2(amount), currency: 'ZMW' };
  }

  const amount = Number(process.env.KENYA_REFERRAL_BONUS_KES) || 50;
  return { amount: roundTo2(amount), currency: 'KES' };
}

function getTaskMinWithdrawalForCountry(country) {
  const c = getCountry(country);

  if (c === 'zambia') {
    return Number(process.env.ZAMBIA_TASK_MIN_WITHDRAWAL_ZMW) || 980;
  }

  return Number(process.env.KENYA_TASK_MIN_WITHDRAWAL_KES) || 1000;
}

function getActivationFeeKESForCountry(country) {
  return getActivationFeeForCountry(country).amount;
}

function getReferralBonusKESForCountry(country) {
  return getReferralBonusForCountry(country).amount;
}

export {
  getActivationFeeForCountry,
  getActivationFeeKESForCountry,
  getCurrencyCodeForCountry,
  getReferralBonusForCountry,
  getReferralBonusKESForCountry,
  getTaskMinWithdrawalForCountry,
};

export default {
  getActivationFeeForCountry,
  getActivationFeeKESForCountry,
  getCurrencyCodeForCountry,
  getReferralBonusForCountry,
  getReferralBonusKESForCountry,
  getTaskMinWithdrawalForCountry,
};

