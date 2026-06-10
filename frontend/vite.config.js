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

// https://vite.dev/config/
export default defineConfig({
  // Allow explicit override for Vercel or other hosts.
  base: process.env.VITE_BASE_PATH || getHomepageBase(),
  plugins: [react()],
})
