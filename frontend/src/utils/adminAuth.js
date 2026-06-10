import authApi from '../api/authApi';

export async function getAdminStatus(user) {
  if (!user) return false;

  try {
    const token = await user.getIdToken();
    const syncResult = await authApi.syncUser(token);
    if (typeof syncResult?.isAdmin === 'boolean') {
      return syncResult.isAdmin;
    }
  } catch (err) {
    console.warn('Failed to sync user before admin status check:', err);
  }

  try {
    const idTokenResult = await user.getIdTokenResult(true);
    if (idTokenResult?.claims?.isAdmin === true) {
      return true;
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
