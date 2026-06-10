import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getHomepageBase() {
  const homepage = process.env.npm_package_homepage;
  if (homepage) {
    try {
      const url = new URL(homepage);
      return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
    } catch {
      return homepage.endsWith('/') ? homepage : `${homepage}/`;
    }
  }
  return '/';
}

function getBasePath() {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH;
  }

  // Vercel should always use root path.
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    return '/';
  }

  return getHomepageBase();
}

// https://vite.dev/config/
export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
})
