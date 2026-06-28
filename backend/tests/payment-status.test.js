import { normalizePaymentStatus, shouldAutoActivateRegistration } from '../src/utils/paymentStatus.js';

describe('payment status helpers', () => {
  it('maps Pesapal completion variants to completed', () => {
    expect(normalizePaymentStatus('COMPLETED')).toBe('COMPLETED');
    expect(normalizePaymentStatus('SUCCESS')).toBe('COMPLETED');
    expect(normalizePaymentStatus('PAID')).toBe('COMPLETED');
    expect(normalizePaymentStatus('WAITING FOR PAYMENT')).toBe('PENDING');
    expect(normalizePaymentStatus('CANCELLED')).toBe('FAILED');
  });

  it('allows auto activation when a payment is completed or manual approval is forced', () => {
    expect(shouldAutoActivateRegistration({ paymentStatus: 'COMPLETED' })).toBe(true);
    expect(shouldAutoActivateRegistration({ status: 'COMPLETED' })).toBe(true);
    expect(shouldAutoActivateRegistration({ force: true })).toBe(true);
    expect(shouldAutoActivateRegistration({ paymentStatus: 'PENDING' })).toBe(false);
  });
});
