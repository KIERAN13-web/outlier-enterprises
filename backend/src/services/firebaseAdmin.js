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

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson && !serviceAccountPath) {
    throw new Error('Missing required Firebase credentials. Set either FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH (path to JSON file).');
  }

  if (serviceAccountJson) {
    if (!serviceAccountPath) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is set but FIREBASE_SERVICE_ACCOUNT_PATH is missing. Set FIREBASE_SERVICE_ACCOUNT_PATH to specify where the credentials file should be written.');
    }
    const resolved = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, serviceAccountJson, 'utf8');
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

