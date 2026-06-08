// Firebase client initialization placeholder.
// You must install `firebase` and set env vars for your Firebase config.

// Example env vars (Vite):
// VITE_FIREBASE_API_KEY
// VITE_FIREBASE_AUTH_DOMAIN
// VITE_FIREBASE_PROJECT_ID
// VITE_FIREBASE_STORAGE_BUCKET
// VITE_FIREBASE_MESSAGING_SENDER_ID
// VITE_FIREBASE_APP_ID

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';

function mustGetEnv(name) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: mustGetEnv('VITE_FIREBASE_API_KEY'),
  authDomain: mustGetEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: mustGetEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: mustGetEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: mustGetEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: mustGetEnv('VITE_FIREBASE_APP_ID'),
  databaseURL: mustGetEnv('VITE_FIREBASE_DATABASE_URL'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

let app = null;
let auth = null;
let database = null;
let analytics = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);

  if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    analytics = getAnalytics(app);
  }
} catch (err) {
  console.warn('Firebase initialization failed:', err.message);
  // App will still render without Firebase
}

export { app, auth, database, analytics };
export default app;
