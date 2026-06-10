# Deployment Strategy: Test → Production

This guide walks you through deploying to a **test environment** first, then promoting to **production** with real payments.

## 🎯 Two-Stage Deployment

### Stage 1: Test Environment (Sandbox)
- Use Pesapal **sandbox** credentials
- Test all payment flows
- Verify webhook handling
- No real money involved

### Stage 2: Production Environment
- Switch to Pesapal **production** credentials
- Use real payment methods
- Full monitoring and logging

---

## 📋 Environment Variables Setup

### Backend Variables

**Required for both test and production:**

```env
# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_DATABASE_URL=https://outlier-enterprise-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_PROJECT_ID=outlier-enterprise

# Server
PORT=4000
NODE_ENV=production  # for Railway deployment

# CORS
CORS_ORIGIN=https://your-frontend-url.com

# Pesapal Configuration (COPY FROM RAILWAY UI)
PESAPAL_ENV=sandbox              # TEST ONLY - change to 'production' for real payments
PESAPAL_CONSUMER_KEY=YOUR_KEY
PESAPAL_CONSUMER_SECRET=YOUR_SECRET
PESAPAL_CALLBACK_URL=https://your-backend-url/api/payments/pesapal/webhook
PESAPAL_WEBHOOK_SECRET=your_webhook_secret
```

### Frontend Variables

```env
VITE_API_URL=https://your-backend-url
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_DATABASE_URL=https://your-db.firebasedatabase.app
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🧪 TEST ENVIRONMENT DEPLOYMENT

### Step 1: Get Sandbox Credentials

1. Go to **https://pesapal.com/developer**
2. Sign up for a sandbox account
3. In your sandbox dashboard:
   - Find **API Keys** section
   - Copy the **API Key** (PESAPAL_CONSUMER_KEY)
   - Copy the **API Secret** (PESAPAL_CONSUMER_SECRET)
4. Note the webhook secret if available

### Step 2: Set Test Environment Variables on Railway

1. Go to **https://railway.app**
2. Select your **backend project** (or create new one)
3. Go to **Settings** → **Variables**
4. Add these variables:

   ```
   NODE_ENV=production
   PORT=4000
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   FIREBASE_DATABASE_URL=https://outlier-enterprise-default-rtdb.asia-southeast1.firebasedatabase.app
   FIREBASE_PROJECT_ID=outlier-enterprise
   CORS_ORIGIN=https://your-test-frontend-url.vercel.app
   
   PESAPAL_ENV=sandbox
   PESAPAL_CONSUMER_KEY=your_sandbox_key
   PESAPAL_CONSUMER_SECRET=your_sandbox_secret
   PESAPAL_CALLBACK_URL=https://your-test-backend-url.railway.app/api/payments/pesapal/webhook
   PESAPAL_WEBHOOK_SECRET=your_sandbox_webhook_secret
   ```

5. Click **"Save & Redeploy"**

### Step 3: Deploy Frontend (Test)

Option A: Using Vercel
1. Go to **https://vercel.com**
2. Create a new project (or use existing)
3. Connect your GitHub repo
4. Add environment variables from above with `VITE_` prefix
5. Set `VITE_API_URL` to your test backend Railway URL
6. Deploy

Option B: Using built-in deployment script
```bash
.\deploy-frontend.bat  # Windows
```

### Step 4: Test Sandbox Payment Flow

```bash
# 1. Test the sandbox script locally first
node backend/tests/pesapal-sandbox-test.js

# Expected output:
# ✅ Access Token Obtained
# ✅ Transaction Initiated
# ✅ Status Retrieved
# ✅ Webhook Signature Valid
```

If test passes, proceed to browser testing:

1. Visit your test frontend URL
2. Go to **Register** → **Payment**
3. Select **Pesapal** option
4. Click "Pay with Pesapal"
5. Complete sandbox payment
6. You'll see a "Simulate payment completion" button (dev feature)
7. Click it to simulate webhook
8. Should redirect to login automatically

### Step 5: Verify Test Deployment

**Backend Health Check:**
```bash
curl https://your-test-backend-url.railway.app/health
# Should return: {"ok":true}
```

**Check Logs:**
1. Go to Railway dashboard
2. Select your backend project
3. Click **Logs** tab
4. You should see `[Pesapal]` log entries with your test transactions

**Check Database:**
1. Go to Firebase console
2. Check `pendingPayments` and `pendingUsers` nodes
3. Verify transactions are being created and updated

---

## ✅ TEST ENVIRONMENT CHECKLIST

- [ ] Pesapal sandbox credentials obtained
- [ ] Backend variables set on Railway (PESAPAL_ENV=sandbox)
- [ ] Frontend deployed with test backend URL
- [ ] Health check endpoint returns 200
- [ ] Sandbox test script runs successfully
- [ ] Payment flow tested in browser
- [ ] Transaction appears in Firebase database
- [ ] Webhook simulation works
- [ ] Logs show `[Pesapal]` entries

---

## 🚀 PRODUCTION ENVIRONMENT DEPLOYMENT

**⚠️ ONLY AFTER SUCCESSFUL TEST ENVIRONMENT**

### Step 1: Get Production Credentials

1. Contact Pesapal support or go to production dashboard
2. Request production API keys
3. Get production webhook secret
4. Verify production callback URL can receive webhooks

### Step 2: Update Backend Variables (Production)

On Railway, update backend variables:

```
PESAPAL_ENV=production
PESAPAL_CONSUMER_KEY=your_production_key
PESAPAL_CONSUMER_SECRET=your_production_secret
PESAPAL_CALLBACK_URL=https://your-production-backend-url/api/payments/pesapal/webhook
PESAPAL_WEBHOOK_SECRET=your_production_webhook_secret

CORS_ORIGIN=https://your-production-frontend-url.com
```

### Step 3: Update Frontend URL

Frontend environment:
```
VITE_API_URL=https://your-production-backend-url.railway.app
```

### Step 4: Test Production Payment

⚠️ **Start with small amount (100 KES)**

1. Visit your production frontend
2. Register with test payment method
3. Attempt small payment
4. Verify payment success
5. Check database for transaction
6. Check logs for completion

### Step 5: Monitor Production

1. Set up alerts for failed transactions
2. Check logs daily for errors
3. Monitor Pesapal dashboard
4. Monitor Firebase database for payment records

---

## 📊 Production Checklist

- [ ] Production credentials obtained from Pesapal
- [ ] Backend variables updated (PESAPAL_ENV=production)
- [ ] Frontend pointing to production backend URL
- [ ] CORS_ORIGIN set to production frontend URL
- [ ] Webhook callback URL verified and accessible
- [ ] Test with small payment (100 KES) successful
- [ ] Transaction logged in Firebase
- [ ] Webhook receipt verified in logs
- [ ] Monitoring and alerts configured
- [ ] Team informed of go-live
- [ ] Backup plan ready for rollback

---

## 🔄 Switching Between Environments

### Test → Production

1. **Keep test environment running** for future testing
2. **Create production Railway project** (separate from test)
3. **Update frontend deployment** to point to production backend
4. **Use different Firebase paths** if needed for test vs production data

### Configuration Comparison

| Setting | Test | Production |
|---------|------|------------|
| PESAPAL_ENV | sandbox | production |
| API Endpoint | https://cybjqa.pesapal.com/pesapalv3/api | https://pay.pesapal.com/v3/api |
| CORS_ORIGIN | test.vercel.app | app.yourdomain.com |
| Money Flow | No actual money | Real payments |
| Risk | Low | High |

---

## 🆘 Troubleshooting

### "PESAPAL_CONSUMER_KEY not set"
- Verify variable is added to Railway Variables
- Check variable name spelling (case-sensitive)
- Redeploy after adding variable

### "Token request failed: HTTP 401"
- Verify credentials are correct
- Check you're using sandbox keys for PESAPAL_ENV=sandbox
- Check credentials haven't expired

### "Webhook signature mismatch" (Production)
- Verify PESAPAL_WEBHOOK_SECRET is correct
- Check Pesapal webhook secret matches
- Ensure webhook verification is enabled

### "CORS error" in browser
- Verify CORS_ORIGIN matches your frontend URL exactly
- Include protocol (https://) and domain only
- Redeploy backend after changing CORS_ORIGIN

### Logs not showing up
- Wait 1-2 minutes after deploying
- Check Railway Logs tab (not Build tab)
- Look for `[Pesapal]` prefix in logs

---

## 📞 Support

**Pesapal Documentation:** https://developer.pesapal.com/
**Railway Docs:** https://docs.railway.app/
**Vercel Docs:** https://vercel.com/docs
**Firebase Console:** https://console.firebase.google.com

---

## ⏱️ Timeline

**Recommended deployment schedule:**

- Day 1: Set up test environment, run sandbox tests
- Day 2-3: Test payment flow, debug issues
- Day 4: Get production credentials
- Day 5: Deploy production, test with small payment
- Day 6: Monitor for errors, go live

---

**Note:** All changes have been committed to git and are ready for deployment!

`git commit: feat: Pesapal v3 API integration with JWT authentication`

This implementation is production-ready once you:
1. ✅ Set environment variables
2. ✅ Deploy to test environment (sandbox)
3. ✅ Test payment flow
4. ✅ Get production credentials
5. ✅ Deploy to production
