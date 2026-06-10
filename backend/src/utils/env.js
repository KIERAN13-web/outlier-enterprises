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

  // If Pesapal is configured to use production endpoints, ensure required Pesapal envs exist
  if ((process.env.PESAPAL_ENV || '').toLowerCase() === 'production') {
    if (!process.env.PESAPAL_CONSUMER_KEY && !process.env.PESAPAL_KEY && !process.env.PESAPAL_API_KEY) {
      missing.push('PESAPAL_CONSUMER_KEY / PESAPAL_KEY / PESAPAL_API_KEY');
    }
    if (!process.env.PESAPAL_CONSUMER_SECRET && !process.env.PESAPAL_SECRET && !process.env.PESAPAL_API_SECRET) {
      missing.push('PESAPAL_CONSUMER_SECRET / PESAPAL_SECRET / PESAPAL_API_SECRET');
    }
    if (!process.env.PESAPAL_CALLBACK_URL) {
      missing.push('PESAPAL_CALLBACK_URL');
    }
    if (!process.env.PESAPAL_WEBHOOK_SECRET) {
      missing.push('PESAPAL_WEBHOOK_SECRET');
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
