import { parseAmount, validateOrderAmount, MIN_ORDER_AMOUNT, MAX_ORDER_AMOUNT } from '../src/utils/orderValidation.js';

describe('orderValidation', () => {
  it('parses valid numeric amounts', () => {
    expect(parseAmount('300')).toEqual({ ok: true, value: 300 });
    expect(parseAmount(250)).toEqual({ ok: true, value: 250 });
  });

  it('rejects missing or invalid amounts', () => {
    expect(parseAmount('')).toEqual({ ok: false, error: 'amount_required', message: 'Amount is required.' });
    expect(parseAmount('abc')).toEqual({ ok: false, error: 'invalid_amount', message: 'Amount must be a valid number.' });
    expect(parseAmount(-10)).toEqual({ ok: false, error: 'invalid_amount', message: 'Amount must be greater than zero.' });
  });

  it('validates the configured order range', () => {
    expect(validateOrderAmount(MIN_ORDER_AMOUNT)).toEqual({ ok: true });
    expect(validateOrderAmount(MAX_ORDER_AMOUNT)).toEqual({ ok: true });
    expect(validateOrderAmount(MIN_ORDER_AMOUNT - 1)).toEqual({
      ok: false,
      error: 'invalid_order_amount',
      message: `Order amount must be between KES ${MIN_ORDER_AMOUNT} and KES ${MAX_ORDER_AMOUNT}.`,
    });
  });
});
