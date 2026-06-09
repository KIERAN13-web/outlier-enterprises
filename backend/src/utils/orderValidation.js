const MIN_ORDER_AMOUNT = Number(process.env.MIN_ORDER_AMOUNT) || 250;
const MAX_ORDER_AMOUNT = Number(process.env.MAX_ORDER_AMOUNT) || 400;
const MAX_ORDERS_PER_DAY = Number(process.env.MAX_ORDERS_PER_DAY) || 1;
const MAX_ORDERS_PER_WEEK = Number(process.env.MAX_ORDERS_PER_WEEK) || 5;

function parseAmount(raw) {
  const amount = Number(raw);

  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, error: 'amount_required', message: 'Amount is required.' };
  }

  if (Number.isNaN(amount) || !Number.isFinite(amount)) {
    return { ok: false, error: 'invalid_amount', message: 'Amount must be a valid number.' };
  }

  if (amount <= 0) {
    return { ok: false, error: 'invalid_amount', message: 'Amount must be greater than zero.' };
  }

  return { ok: true, value: amount };
}

function validateOrderAmount(amount) {
  if (amount < MIN_ORDER_AMOUNT || amount > MAX_ORDER_AMOUNT) {
    return {
      ok: false,
      error: 'invalid_order_amount',
      message: `Order amount must be between KES ${MIN_ORDER_AMOUNT} and KES ${MAX_ORDER_AMOUNT}.`,
    };
  }

  return { ok: true };
}

export {
  MIN_ORDER_AMOUNT,
  MAX_ORDER_AMOUNT,
  MAX_ORDERS_PER_DAY,
  MAX_ORDERS_PER_WEEK,
  parseAmount,
  validateOrderAmount,
};
