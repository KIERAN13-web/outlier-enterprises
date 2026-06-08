# Chat App - Deployment Guide

This is a full-stack chat application with React frontend and Express backend. This guide will help you deploy it to production.

## 🏗️ Project Structure

```
chat-app/
├── src/                    # Frontend (React + Vite)
│   ├── pages/             # Page components
│   ├── components/        # Reusable components
│   ├── api/              # API client functions
│   └── main.jsx
├── backend/               # Backend (Express + Node.js)
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── services/     # Firebase & external services
│   │   └── index.js
│   └── package.json
├── package.json           # Frontend dependencies
├── vite.config.js        # Vite configuration
└── DEPLOYMENT.md         # Detailed deployment instructions
```

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 16+
- npm or yarn
- Firebase project with Realtime Database
- M-Pesa merchant account (for payments)

### Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd chat-app
   npm install
   cd backend && npm install && cd ..
   ```

2. **Configure Environment**
   - Copy `.env.example` → `.env.local` (frontend)
   - Copy `backend/.env.example` → `backend/.env` (backend)
   - Update values with your Firebase and M-Pesa credentials

3. **Get Firebase Service Account Key**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `backend/serviceAccountKey.json`

4. **Run Locally**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   # Opens http://localhost:5173

   # Terminal 2: Backend
   cd backend && npm run dev
   # Runs on http://localhost:4000
   ```

## 🚀 Production Deployment

### Option A: Using Deployment Scripts (Recommended)

#### On Windows:
```bash
# Frontend
.\deploy-frontend.bat

# Backend
.\deploy-backend.bat
```

#### On macOS/Linux:
```bash
# Frontend
chmod +x deploy-frontend.sh
./deploy-frontend.sh

# Backend
chmod +x deploy-backend.sh
./deploy-backend.sh
```

### Option B: Manual Deployment

#### Step 1: Deploy Backend (Railway)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select this repository
4. Railway auto-detects Node.js
5. Set environment variables in Railway:
   ```
   PORT=4000
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend.vercel.app
   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
   ```
6. Upload `serviceAccountKey.json` as a file or secret
7. Deploy and note your backend URL

#### Step 2: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import this GitHub repository
4. Framework: **Vite**
5. Set environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://xxx.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=xxx
   VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
   VITE_FIREBASE_APP_ID=xxx
   ```
6. Deploy

#### Step 3: Update Backend CORS

1. Return to Railway backend
2. Update `CORS_ORIGIN` to your Vercel frontend URL
3. Redeploy

## 📋 Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_DATABASE_URL=your_db_url
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend (.env)
```
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
```

## 🔒 Security Checklist

- [ ] Firebase credentials are secure (use secrets, not in code)
- [ ] `serviceAccountKey.json` is in `.gitignore`
- [ ] Environment variables are set in Railway/Vercel dashboards
- [ ] CORS_ORIGIN is restricted to your frontend URL
- [ ] Firebase Database Rules are properly configured
- [ ] M-Pesa API credentials are secure

## 🧪 Testing Deployment

### Backend Health Check
```bash
curl https://your-backend.railway.app/health
# Should return: {"ok":true,"environment":"production"}
```

### Frontend Load
- Visit `https://your-frontend.vercel.app`
- Try registration flow
- Check payment integration
- Verify database operations

## 📝 Build Commands

### Frontend
```bash
npm run dev      # Local development
npm run build    # Production build
npm run preview  # Preview production build locally
npm run lint     # Check code quality
```

### Backend
```bash
npm run dev      # Development with auto-reload
npm start        # Production start
```

## 🔄 Auto-Deploy

Both Railway (backend) and Vercel (frontend) support auto-deployment:

1. Push to `main` branch: `git push`
2. Services automatically redeploy
3. No manual intervention needed

## 🐛 Troubleshooting

### CORS Errors
- Check backend `CORS_ORIGIN` matches frontend URL exactly
- Ensure backend is running and accessible

### API 404 Errors
- Verify `VITE_API_URL` in frontend matches backend URL
- Check backend routes in `backend/src/routes/`

### Firebase Errors
- Verify `serviceAccountKey.json` is in backend directory
- Check Firebase credentials in frontend `.env`
- Ensure Realtime Database is enabled

### Payment Issues
- Verify M-Pesa credentials in backend
- Check webhook configuration
- Test payment flow in development first

## 📚 Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://railway.app/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [Express Docs](https://expressjs.com/)

## 📧 Support

For issues or questions, check:
1. Error logs in Railway/Vercel dashboards
2. Browser console for frontend errors
3. Terminal output for backend logs
4. Firebase Console for data issues

---

**Happy Deploying!** 🎉
