function getCountry(configCountry) {
  return String(configCountry || '').trim().toLowerCase();
}

function zmwToKes(amountZmw) {
  const rate = Number(process.env.ZMW_TO_KES_RATE);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Missing/invalid env ZMW_TO_KES_RATE (expected a positive number)');
  }
  return amountZmw * rate;
}

function roundTo2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getActivationFeeKESForCountry(country) {
  const c = getCountry(country);

  // Kenya
  if (c === 'kenya') {
    return Number(process.env.KENYA_ACTIVATION_FEE_KES) || 200;
  }

  // Zambia
  if (c === 'zambia') {
    const activationZmw = Number(process.env.ZAMBIA_ACTIVATION_FEE_ZMW) || 100;
    return roundTo2(zmwToKes(activationZmw));
  }

  // Default to Kenya (system currently supports Kenya + Zambia only)
  return Number(process.env.KENYA_ACTIVATION_FEE_KES) || 200;
}

function getReferralBonusKESForCountry(country) {
  const c = getCountry(country);

  // Kenya
  if (c === 'kenya') {
    return Number(process.env.KENYA_REFERRAL_BONUS_KES) || 50;
  }

  // Zambia
  if (c === 'zambia') {
    const referralZmw = Number(process.env.ZAMBIA_REFERRAL_BONUS_ZMW) || Number(process.env.ZAMBIA_REFERRAL_BONUS_ZMW) || 25;
    return roundTo2(zmwToKes(referralZmw));
  }

  return Number(process.env.KENYA_REFERRAL_BONUS_KES) || 50;
}

export {
  getActivationFeeKESForCountry,
  getReferralBonusKESForCountry,
};

