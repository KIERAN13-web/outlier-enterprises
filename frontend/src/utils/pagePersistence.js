/**
 * Page Persistence Utility
 * Helps maintain user's current page position across login/logout and page reloads
 */

const REDIRECT_PAGE_KEY = 'app:redirect_page';
const PUBLIC_PAGES = ['/', '/login', '/register', '/payment'];

/**
 * Save the current page (for restoring after login)
 */
export function saveCurrentPage(pathname) {
  if (!PUBLIC_PAGES.includes(pathname) && pathname.includes('/')) {
    try {
      localStorage.setItem(REDIRECT_PAGE_KEY, pathname);
    } catch (e) {
      console.warn('Failed to save page:', e);
    }
  }
}

/**
 * Get the saved redirect page and clear it
 */
export function getAndClearRedirectPage() {
  try {
    const page = localStorage.getItem(REDIRECT_PAGE_KEY);
    if (page) {
      localStorage.removeItem(REDIRECT_PAGE_KEY);
      return page;
    }
  } catch (e) {
    console.warn('Failed to get redirect page:', e);
  }
  return null;
}

/**
 * Clear any saved redirect page
 */
export function clearRedirectPage() {
  try {
    localStorage.removeItem(REDIRECT_PAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear redirect page:', e);
  }
}
