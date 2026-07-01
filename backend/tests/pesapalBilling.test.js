import { buildPesapalBillingAddress } from '../src/utils/pesapalBilling.js';

describe('Pesapal billing address helpers', () => {
  it('builds Kenya billing details for Kenyan phone numbers', () => {
    expect(buildPesapalBillingAddress('Kenya', '0712345678', 'Jane', 'Doe', 'jane@example.com')).toEqual({
      email_address: 'jane@example.com',
      phone_number: '+254712345678',
      country_code: 'KE',
      first_name: 'Jane',
      last_name: 'Doe',
    });
  });

  it('builds Zambia billing details for Zambian phone numbers', () => {
    expect(buildPesapalBillingAddress('Zambia', '0977123456', 'John', 'K', 'john@example.com')).toEqual({
      email_address: 'john@example.com',
      phone_number: '+260977123456',
      country_code: 'ZM',
      first_name: 'John',
      last_name: 'K',
    });
  });
});
