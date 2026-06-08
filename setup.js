#!/usr/bin/env node

/**
 * Quick Setup Script
 * Run: node setup.js
 * 
 * This script helps you quickly set up environment files
 * for development and deployment
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

async function setup() {
  console.log('\n🚀 Chat App Setup Script\n');
  console.log('This will help you configure your environment files.\n');

  // Frontend setup
  console.log('=== FRONTEND SETUP ===\n');

  const frontendEnvPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(frontendEnvPath)) {
    console.log('Creating .env.local for frontend...');
    const apiUrl = await question(
      'Backend API URL (leave empty for localhost:4000): '
    );

    const firebaseKey = await question('Firebase API Key: ');
    const firebaseDomain = await question('Firebase Auth Domain: ');
    const firebaseDbUrl = await question('Firebase Database URL: ');
    const firebaseProjectId = await question('Firebase Project ID: ');
    const firebaseStorageBucket = await question(
      'Firebase Storage Bucket: '
    );
    const firebaseSenderId = await question('Firebase Messaging Sender ID: ');
    const firebaseAppId = await question('Firebase App ID: ');

    const frontendEnv = `VITE_API_URL=${apiUrl || 'http://localhost:4000'}
VITE_FIREBASE_API_KEY=${firebaseKey}
VITE_FIREBASE_AUTH_DOMAIN=${firebaseDomain}
VITE_FIREBASE_DATABASE_URL=${firebaseDbUrl}
VITE_FIREBASE_PROJECT_ID=${firebaseProjectId}
VITE_FIREBASE_STORAGE_BUCKET=${firebaseStorageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${firebaseSenderId}
VITE_FIREBASE_APP_ID=${firebaseAppId}
`;

    fs.writeFileSync(frontendEnvPath, frontendEnv);
    console.log('✅ .env.local created\n');
  } else {
    console.log('✅ .env.local already exists\n');
  }

  // Backend setup
  console.log('=== BACKEND SETUP ===\n');

  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  if (!fs.existsSync(backendEnvPath)) {
    console.log('Creating .env for backend...');
    const port = await question('Backend Port (default 4000): ');
    const corsOrigin = await question(
      'CORS Origin (leave empty for http://localhost:5173): '
    );

    const backendEnv = `PORT=${port || '4000'}
NODE_ENV=development
CORS_ORIGIN=${corsOrigin || 'http://localhost:5173'}
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
`;

    fs.writeFileSync(backendEnvPath, backendEnv);
    console.log('✅ backend/.env created\n');
  } else {
    console.log('✅ backend/.env already exists\n');
  }

  // Check Firebase key
  const firebaseKeyPath = path.join(__dirname, 'backend', 'serviceAccountKey.json');
  if (!fs.existsSync(firebaseKeyPath)) {
    console.log('⚠️  Firebase Service Account Key not found');
    console.log('📝 To get it:');
    console.log(
      '   1. Go to Firebase Console → Your Project → Settings → Service Accounts'
    );
    console.log('   2. Click "Generate New Private Key"');
    console.log(`   3. Save it as: backend/serviceAccountKey.json\n`);
  } else {
    console.log('✅ Firebase Service Account Key found\n');
  }

  console.log('=== SETUP COMPLETE ===\n');
  console.log('Next steps:');
  console.log('1. Install dependencies: npm install && cd backend && npm install && cd ..');
  console.log('2. Start frontend: npm run dev');
  console.log('3. Start backend (new terminal): cd backend && npm run dev');
  console.log('4. Visit http://localhost:5173\n');

  rl.close();
}

setup().catch(console.error);
