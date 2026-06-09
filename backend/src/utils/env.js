function validateStartupEnv() {
  const missing = [];

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    missing.push('FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH');
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CORS_ORIGIN && !process.env.CORS_ORIGINS) {
      missing.push('CORS_ORIGIN or CORS_ORIGINS');
    }
    if (!process.env.FIREBASE_DATABASE_URL && !process.env.VITE_FIREBASE_DATABASE_URL) {
      missing.push('FIREBASE_DATABASE_URL or VITE_FIREBASE_DATABASE_URL');
    }
  }

  if (missing.length === 0) {
    return;
  }

  const message = `Required environment variables are missing: ${missing.join(', ')}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  console.warn(`WARNING: ${message}`);
}

export { validateStartupEnv };
