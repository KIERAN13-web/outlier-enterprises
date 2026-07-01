function normalizePhoneForPesapal(phoneNumber, country) {
  if (!phoneNumber) return '';

  const digits = String(phoneNumber).replace(/[^0-9]/g, '');
  const normalizedCountry = String(country || '').trim().toLowerCase();

  if (normalizedCountry === 'zambia') {
    if (digits.startsWith('260') && digits.length === 12) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+260${digits.slice(1)}`;
    if (digits.startsWith('260') && digits.length > 12) return `+${digits.slice(0, 12)}`;
    return digits ? `+${digits}` : '';
  }

  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.startsWith('254') && digits.length > 12) return `+${digits.slice(0, 12)}`;
  return digits ? `+${digits}` : '';
}

function getCountryCodeForPesapal(country) {
  const normalizedCountry = String(country || '').trim().toLowerCase();
  if (normalizedCountry === 'zambia') return 'ZM';
  return 'KE';
}

function buildPesapalBillingAddress(country, phoneNumber, firstName, lastName, email) {
  return {
    email_address: email || 'customer@pesapal.com',
    phone_number: normalizePhoneForPesapal(phoneNumber, country),
    country_code: getCountryCodeForPesapal(country),
    first_name: firstName || 'Customer',
    last_name: lastName || '',
  };
}

export { buildPesapalBillingAddress, getCountryCodeForPesapal, normalizePhoneForPesapal };
export default { buildPesapalBillingAddress, getCountryCodeForPesapal, normalizePhoneForPesapal };
