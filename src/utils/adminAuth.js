import { getIdTokenResult } from 'firebase/auth';
import authApi from '../api/authApi';

export async function resolveAdminStatus(user) {
  if (!user) return false;

  try {
    const token = await user.getIdToken();
    const syncResult = await authApi.syncUser(token);
    if (typeof syncResult?.isAdmin === 'boolean') {
      return syncResult.isAdmin;
    }
  } catch (err) {
    console.warn('[adminAuth] syncUser failed:', err);
  }

  try {
    const idTokenResult = await getIdTokenResult(user, true);
    if (idTokenResult?.claims?.isAdmin === true) {
      return true;
    }
  } catch (err) {
    console.warn('[adminAuth] getIdTokenResult failed:', err);
  }

  try {
    const token = await user.getIdToken();
    const statusResult = await authApi.getStatus(token);
    return Boolean(statusResult?.isAdmin);
  } catch (err) {
    console.warn('[adminAuth] getStatus failed:', err);
    return false;
  }
}
