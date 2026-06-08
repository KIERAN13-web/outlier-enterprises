# Deployment Guide

This guide will help you deploy your chat app frontend and backend to production.

## Prerequisites

- GitHub account with your repository pushed
- Vercel account (for frontend)
- Railway account (for backend)
- Firebase project with credentials

---

## 1. BACKEND DEPLOYMENT (Railway)

### Step 1: Prepare Backend

1. Copy `.env.example` to `.env` and fill in values:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Update `.env` with production values:
   ```
   PORT=4000
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
   ```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your repository
4. Railway will auto-detect Node.js
5. Go to **Settings** → **Environment**
6. Add variables from `.env.production`
7. Upload `serviceAccountKey.json`:
   - In Variables, create a secret for your Firebase key
   - Or upload the file to the Railway filesystem
8. Click **"Deploy"**
9. Copy your Railway URL (e.g., `https://chat-app-backend.railway.app`)

### Step 3: Test Backend

```bash
# Test from terminal
curl https://your-railway-url/health

# Should return: {"ok":true}
```

---

## 2. FRONTEND DEPLOYMENT (Vercel)

### Step 1: Prepare Frontend

1. Copy `.env.example` to `.env.production`:
   ```bash
   cp .env.example .env.production
   ```

2. Update `.env.production`:
   ```
   VITE_API_URL=https://your-railway-url
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_DATABASE_URL=your_db_url
   VITE_FIREBASE_PROJECT_ID=your_project
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Select the root folder (NOT the backend folder)
5. Framework: **Vite**
6. Environment Variables:
   - Add all variables from `.env.production`
   - Make sure `VITE_API_URL` points to your Railway URL
7. Click **"Deploy"**
8. Wait for build to complete
9. Copy your Vercel URL (e.g., `https://chat-app.vercel.app`)

---

## 3. UPDATE BACKEND CORS

After frontend deployment, update backend CORS:

1. Go back to Railway dashboard
2. Select your backend project
3. Go to **Variables**
4. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN=https://chat-app.vercel.app
   ```
5. Redeploy

---

## 4. FINAL TESTING

### Test Frontend
- Visit `https://your-app.vercel.app`
- Register a new account
- Try payment flow
- Check dashboard

### Test Backend API
```bash
# Health check
curl https://your-backend.railway.app/health

# Should return: {"ok":true}
```

---

## PRODUCTION CHECKLIST

- [ ] Backend environment variables set correctly
- [ ] Frontend VITE_API_URL points to backend
- [ ] Firebase credentials in both services
- [ ] CORS_ORIGIN set to frontend URL
- [ ] serviceAccountKey.json uploaded to backend
- [ ] Both services deployed and URLs working
- [ ] Payment flow tested
- [ ] Database access verified

---

## LOCAL DEVELOPMENT

### Frontend
```bash
npm install
npm run dev
# Runs on http://localhost:5173
```

### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:4000
```

---

## TROUBLESHOOTING

### CORS Errors
- Check backend `CORS_ORIGIN` environment variable
- Make sure it matches your frontend URL exactly

### API Calls Failing
- Check `VITE_API_URL` in frontend `.env.production`
- Verify backend is running
- Check network tab in browser DevTools

### Firebase Errors
- Verify `serviceAccountKey.json` exists
- Check Firebase credentials are correct
- Ensure Firebase Realtime Database is enabled

---

## REDEPLOY AFTER CODE CHANGES

### Backend
```bash
git push  # Will auto-deploy on Railway
```

### Frontend
```bash
git push  # Will auto-deploy on Vercel
```

Both services will redeploy automatically when you push to GitHub.
