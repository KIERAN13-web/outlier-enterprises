import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function initFirebaseAdmin() {
  if (admin.apps.length > 0) return admin;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

  if (!serviceAccountPath) {
    throw new Error('Missing required FIREBASE_SERVICE_ACCOUNT_PATH environment variable for Firebase Admin initialization.');
  }

  const resolved = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.resolve(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Firebase service account not found at ${resolved}. Please provide a valid service account JSON file.`);
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL || undefined,
    projectId: projectId || serviceAccount.project_id,
  });

  return admin;
}

const firebaseAdmin = await initFirebaseAdmin();

export default firebaseAdmin;

