# 🚀 Quick Deployment Reference Card

## ⚡ 30-Second Setup

```bash
# 1. Configure environment
node setup.js

# 2. Test locally
npm install && cd backend && npm install && cd ..
npm run dev           # Terminal 1
cd backend && npm run dev  # Terminal 2

# 3. Deploy backend
# Go to railway.app → Import GitHub → Deploy

# 4. Deploy frontend
# Go to vercel.com → Import GitHub → Deploy
```

---

## 📋 Environment Variables Needed

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=<your_key>
VITE_FIREBASE_AUTH_DOMAIN=<your_domain>.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://<your_db>.firebaseio.com
VITE_FIREBASE_PROJECT_ID=<your_project>
VITE_FIREBASE_STORAGE_BUCKET=<your_bucket>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
VITE_FIREBASE_APP_ID=<your_app_id>
```

### Backend (.env)
```
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
```

---

## 🎯 Production Deployment Steps

### Step 1: Backend (Railway)
```
1. Go to railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repo
4. Set environment variables:
   - PORT=4000
   - NODE_ENV=production
   - CORS_ORIGIN=https://your-app.vercel.app
5. Upload serviceAccountKey.json
6. Deploy
7. Copy backend URL
```

### Step 2: Frontend (Vercel)
```
1. Go to vercel.com
2. Click "Add New" → "Project"
3. Import your repo
4. Framework: Vite
5. Set env variables with VITE_API_URL = your backend URL
6. Deploy
7. Copy frontend URL
```

### Step 3: Update Backend CORS
```
1. Go back to Railway
2. Update CORS_ORIGIN = your frontend URL
3. Redeploy
```

---

## ✅ Testing Commands

```bash
# Health check
curl https://your-backend.railway.app/health

# Local frontend
http://localhost:5173

# Production frontend
https://your-app.vercel.app
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| API 404 errors | Check VITE_API_URL in frontend |
| CORS errors | Update CORS_ORIGIN in backend to match frontend URL |
| Firebase errors | Check serviceAccountKey.json exists |
| Payment button not showing | Already fixed in v1.1! |

---

## 📁 Key Files Created

- `.env.example` - Frontend template
- `.env.production` - Frontend production
- `backend/.env.example` - Backend template
- `backend/.env.production` - Backend production
- `deploy-frontend.sh/bat` - Deployment script
- `deploy-backend.sh/bat` - Deployment script
- `DEPLOYMENT.md` - Full guide
- `PRODUCTION_SETUP.md` - Setup guide
- `setup.js` - Interactive setup
- `IMPLEMENTATION_SUMMARY.md` - What was done

---

## 🚦 Pre-Deployment Checklist

- [ ] Firebase project created
- [ ] serviceAccountKey.json downloaded
- [ ] GitHub repo initialized
- [ ] Railway account ready
- [ ] Vercel account ready
- [ ] Environment variables prepared
- [ ] M-Pesa merchant account active
- [ ] Tested locally

---

## 🎯 What Changed

✅ **Payment Button:** Now always shown (auto-complete removed)
✅ **Environment Setup:** Complete .env configuration
✅ **Deployment Scripts:** Automated setup for Windows/Mac/Linux
✅ **Documentation:** Full deployment guides
✅ **Code Updates:** Production-ready API client and backend

---

## 📞 Support Resources

- [Railway Docs](https://railway.app/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Vite Docs](https://vitejs.dev/)

---

**Ready to deploy? Start with `node setup.js`!** 🚀
