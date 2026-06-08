// Outlier detection placeholder.
// You should replace this with a real statistical / ML method.

function detectOutliers(accounts) {
  if (!Array.isArray(accounts)) return [];

  // Example placeholder rule:
  // If account has a numeric field named `amount` and it is extreme.
  // For now: return accounts that explicitly mark `isSuspicious: true`.

  return accounts.filter((a) => Boolean(a.isSuspicious));
}

export default { detectOutliers };

