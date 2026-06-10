import authApi from '../api/authApi';

export async function getAdminStatus(user) {
  console.log('[getAdminStatus] START', { uid: user?.uid });
  if (!user) {
    console.log('[getAdminStatus] No user, returning false');
    return false;
  }

  try {
    const token = await user.getIdToken();
    console.log('[getAdminStatus] Got token, calling syncUser');
    const syncResult = await authApi.syncUser(token);
    console.log('[getAdminStatus] syncUser result:', syncResult);
    if (typeof syncResult?.isAdmin === 'boolean') {
      console.log('[getAdminStatus] Returning admin status from sync:', syncResult.isAdmin);
      return syncResult.isAdmin;
    }
  } catch (err) {
    console.warn('[getAdminStatus] Failed to sync user before admin status check:', err);
  }

  try {
    console.log('[getAdminStatus] Refreshing token claims');
    const idTokenResult = await user.getIdTokenResult(true);
    console.log('[getAdminStatus] Token claims:', idTokenResult?.claims);
    if (idTokenResult?.claims?.isAdmin === true) {
      console.log('[getAdminStatus] Found isAdmin in token claims, returning true');
      return true;
    }
  } catch (err) {
    console.warn('[getAdminStatus] Failed to resolve admin claims from Firebase token:', err);
  }

  try {
    console.log('[getAdminStatus] Calling fallback getStatus');
    const token = await user.getIdToken();
    const statusResult = await authApi.getStatus(token);
    console.log('[getAdminStatus] Fallback status result:', statusResult);
    return Boolean(statusResult?.isAdmin);
  } catch (err) {
    console.warn('[getAdminStatus] Fallback admin status check failed:', err);
    return false;
  }
}
