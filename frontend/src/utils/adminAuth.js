import authApi from '../api/authApi';

export async function getAdminStatus(user) {
  if (!user) return false;

  try {
    const idTokenResult = await user.getIdTokenResult(true);
    if (idTokenResult?.claims?.isAdmin !== undefined) {
      return Boolean(idTokenResult.claims.isAdmin);
    }
  } catch (err) {
    console.warn('Failed to resolve admin claims from Firebase token:', err);
  }

  try {
    const token = await user.getIdToken();
    const statusResult = await authApi.getStatus(token);
    return Boolean(statusResult?.isAdmin);
  } catch (err) {
    console.warn('Fallback admin status check failed:', err);
    return false;
  }
}
