# 🚀 Quick Deployment Checklist

Complete this checklist to deploy test environment now.

## ✅ Pre-Deployment Requirements

### 1. Git Push ✅ DONE
- [x] All changes committed
- [x] Pushed to GitHub (main branch)

### 2. Backend Environment Setup

**On Railway Dashboard:**

1. [ ] Go to https://railway.app
2. [ ] Select your **backend project** (or create new)
3. [ ] Go to **Settings** → **Variables**
4. [ ] Add/Update these variables:

```
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_DATABASE_URL=https://outlier-enterprise-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_PROJECT_ID=outlier-enterprise
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

5. [ ] Add Pesapal **SANDBOX** credentials:

```
PESAPAL_ENV=sandbox
PESAPAL_CONSUMER_KEY=your_sandbox_api_key
PESAPAL_CONSUMER_SECRET=your_sandbox_api_secret
PESAPAL_CALLBACK_URL=https://your-railway-backend-url/api/payments/pesapal/webhook
PESAPAL_WEBHOOK_SECRET=your_sandbox_webhook_secret
```

6. [ ] Upload/Add Firebase Service Account JSON:
   - In Railway Variables, add `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Paste your `serviceAccountKey.json` contents (raw JSON)
   - Click Save

7. [ ] Click **"Save & Redeploy"**
8. [ ] Wait for deployment (2-5 minutes)
9. [ ] Copy your backend URL: `https://your-project-xxxx.railway.app`

### 3. Frontend Environment Setup

**On Vercel Dashboard (or local for testing):**

1. [ ] Update `.env` file with:

```
VITE_API_URL=https://your-railway-backend-url
VITE_FIREBASE_API_KEY=AIzaSyDVo6nocDxSyNGrUyd5tqQhfsYWcT3ZzLQ
VITE_FIREBASE_AUTH_DOMAIN=outlier-enterprise.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=outlier-enterprise
VITE_FIREBASE_DATABASE_URL=https://outlier-enterprise-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_STORAGE_BUCKET=outlier-enterprise.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=913503245460
VITE_FIREBASE_APP_ID=1:913503245460:web:db0c4434fe28213ffbd081
```

2. [ ] If deploying to Vercel:
   - Add same environment variables to Vercel project
   - Use `VITE_` prefix for frontend vars
   - Deploy

### 4. Get Pesapal Sandbox Credentials

1. [ ] Visit https://pesapal.com/developer
2. [ ] Sign up for sandbox account
3. [ ] In sandbox dashboard, find **API Keys**:
   - [ ] Copy API Key → `PESAPAL_CONSUMER_KEY`
   - [ ] Copy API Secret → `PESAPAL_CONSUMER_SECRET`
4. [ ] Find webhook secret (if available)
5. [ ] Add to Railway variables

---

## 🧪 Testing Phase (After Deployment)

### Step 1: Verify Backend Health

```bash
# Check backend is running
curl https://your-railway-backend-url/health

# Expected: {"ok":true}
```

### Step 2: Run Sandbox Test Script

```bash
# In your local project root
node backend/tests/pesapal-sandbox-test.js

# Should show:
# ✅ Access Token Obtained
# ✅ Transaction Initiated
# ✅ Status Retrieved
# ✅ Webhook Signature Valid
```

### Step 3: Test in Browser

1. [ ] Visit your frontend URL (local or Vercel)
2. [ ] Click **Register**
3. [ ] Fill in test credentials
4. [ ] Go to **Payment** page
5. [ ] Select **Pesapal**
6. [ ] Click **"Pay with Pesapal"**
7. [ ] Popup opens with payment form
8. [ ] Complete payment (sandbox test credentials)
9. [ ] See status page
10. [ ] Click "Simulate payment completion" (dev mode)
11. [ ] Should redirect to login
12. [ ] ✅ Test successful!

### Step 4: Check Database

1. [ ] Go to Firebase Console
2. [ ] Select your project
3. [ ] Go to **Realtime Database**
4. [ ] Check `pendingPayments` node
5. [ ] Should see your test transaction
6. [ ] Status should be "COMPLETED"

### Step 5: Check Logs

1. [ ] Go to Railway dashboard
2. [ ] Select backend project
3. [ ] Click **Logs** tab
4. [ ] Look for `[Pesapal]` log entries
5. [ ] Should see payment initialization, status queries, etc.

---

## 📊 Success Criteria

✅ **Backend deployment successful if:**
- [ ] Health check returns 200
- [ ] No errors in Railway logs
- [ ] `[Pesapal]` logs appear in logs
- [ ] Firebase connection successful

✅ **Frontend deployment successful if:**
- [ ] Page loads without errors
- [ ] API requests go to correct backend
- [ ] Console has no CORS errors
- [ ] Payment form opens

✅ **Payment flow working if:**
- [ ] Sandbox payment completes
- [ ] Transaction in Firebase database
- [ ] Status updates to "COMPLETED"
- [ ] Webhook simulation works
- [ ] User redirects to login

---

## 🎯 Current Status

| Component | Status | URL |
|-----------|--------|-----|
| Git Push | ✅ Complete | |
| Backend Deploy | ⏳ Pending | Set variables on Railway |
| Frontend Deploy | ⏳ Pending | Deploy to Vercel or local |
| Pesapal Credentials | ⏳ Pending | Get sandbox keys |
| Test Environment | ⏳ Pending | Run tests after deploy |

---

## 🔗 Important Links

- **Railway Dashboard:** https://railway.app
- **Vercel Dashboard:** https://vercel.app
- **Firebase Console:** https://console.firebase.google.com
- **Pesapal Developer:** https://pesapal.com/developer
- **Your GitHub:** https://github.com/KIERAN13-web/outlier-enterprises

---

## 📝 Next Steps

1. **NOW:**
   - [ ] Add environment variables to Railway backend
   - [ ] Get Pesapal sandbox credentials
   - [ ] Deploy frontend (Vercel or local)

2. **After Deploy:**
   - [ ] Run sandbox test script
   - [ ] Test payment flow in browser
   - [ ] Check Firebase database
   - [ ] Monitor logs

3. **If Tests Pass:**
   - [ ] Ready to get production Pesapal credentials
   - [ ] Plan production deployment
   - [ ] Test with small real payment
   - [ ] Go live!

---

## 💡 Tips

- **Test locally first:** Use `npm run dev` for frontend and `npm run dev` for backend before deploying
- **Check logs frequently:** Railway logs show real-time output, very helpful for debugging
- **Save credentials:** Keep Pesapal keys in a secure location
- **Don't commit secrets:** Never commit `.env` files or service account keys to GitHub
- **Test sandbox thoroughly:** Spend time testing in sandbox before going to production

---

## 🆘 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| PESAPAL_CONSUMER_KEY not set | Add to Railway Variables, redeploy |
| HTTP 401 on token request | Wrong credentials or expired keys |
| CORS error in browser | Update CORS_ORIGIN in Railway, redeploy |
| Payment doesn't complete | Check webhook secret is correct |
| Logs not showing | Wait 2 min after deploy, check Logs tab not Build tab |

---

**Your commit is ready:** `feat: Pesapal v3 API integration with JWT authentication`

**Ready to deploy?** Follow the checklist above! 🚀
