import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

function normalizeFirebaseJson(rawJson) {
  if (!rawJson) return null;

  const tryParse = (candidate) => {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      return null;
    }
  };

  const trimmed = rawJson.trim();

  // Direct JSON string
  let parsed = tryParse(trimmed);
  if (parsed) return parsed;

  // JSON with escaped newlines
  const unescapedNewlines = trimmed.replace(/\\n/g, '\n');
  parsed = tryParse(unescapedNewlines);
  if (parsed) return parsed;

  // Base64-encoded JSON string
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    parsed = tryParse(decoded);
    if (parsed) return parsed;
  } catch (error) {
    // ignore invalid base64
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed as valid JSON. Provide raw JSON, escaped JSON, or base64-encoded JSON.');
}

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
    : path.join(process.cwd(), 'firebase-service-account.json');

  if (serviceAccountJson) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    const parsedAccount = normalizeFirebaseJson(serviceAccountJson);
    fs.writeFileSync(resolved, JSON.stringify(parsedAccount, null, 2), 'utf8');
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(`Firebase service account not found at ${resolved}. Provide FIREBASE_SERVICE_ACCOUNT_JSON or a valid file at FIREBASE_SERVICE_ACCOUNT_PATH.`);
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const serviceAccount = normalizeFirebaseJson(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL || undefined,
    projectId: projectId || serviceAccount.project_id,
  });

  return admin;
}

const firebaseAdmin = await initFirebaseAdmin();

export default firebaseAdmin;

