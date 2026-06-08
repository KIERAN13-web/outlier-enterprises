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
    throw new Error('Missing Firebase credentials: provide either FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.');
  }

  const resolved = serviceAccountPath
    ? (path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath))
    : path.join('/tmp', 'firebase-service-account.json');

  if (serviceAccountJson) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, serviceAccountJson, 'utf8');
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(`Firebase service account not found at ${resolved}. Provide FIREBASE_SERVICE_ACCOUNT_JSON or a valid file at FIREBASE_SERVICE_ACCOUNT_PATH.`);
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

