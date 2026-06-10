# Pesapal v3 Testing Quick Start

## Prerequisites

1. **Node.js** installed (v14+)
2. **Pesapal sandbox credentials**:
   - Get from: https://pesapal.com/developer
   - Sign up for sandbox account
   - Generate API keys

3. **Environment setup**:
   ```bash
   # In your .env file (root directory)
   PESAPAL_CONSUMER_KEY=your_sandbox_api_key
   PESAPAL_CONSUMER_SECRET=your_sandbox_api_secret
   PESAPAL_ENV=sandbox
   ```

## Quick Test Steps

### Step 1: Run Sandbox Validation Test
```bash
# This tests your credentials and Pesapal connectivity
node backend/tests/pesapal-sandbox-test.js
```

**Expected output:**
```
🚀 PESAPAL V3 SANDBOX INTEGRATION TEST
✅ Access Token Obtained: eyJhbGc...
✅ Transaction Initiated
    Order Tracking ID: 12345678
    Redirect URL: https://...
✅ Status Retrieved
    Payment Status: PENDING
✅ Webhook Signature Valid
```

### Step 2: Start Development Server
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
npm start
```

### Step 3: Test Payment Flow
1. Go to http://localhost:5173 (frontend)
2. Register/Login
3. Go to Payment page
4. Select "Pesapal" option
5. Click "Pay with Pesapal"
6. A popup opens with payment form
7. In sandbox, you can use test credentials
8. After completing payment, you'll see the status page
9. Click "Simulate payment completion" (dev feature)
10. Should redirect to login automatically

### Step 4: Check Logs

**Backend logs** will show:
```
[Pesapal] Requesting token from sandbox environment
[Pesapal] Submitting order TEST_1234 for amount 200 KES
[Pesapal] Successfully obtained access token
[Pesapal] Order TEST_1234 submitted successfully
```

## Troubleshooting

### Test Fails: "PESAPAL_CONSUMER_KEY not set"
```bash
# Make sure .env file exists in root directory
# And has both keys:
cat .env | grep PESAPAL
```

### Test Fails: "Token request failed: HTTP 401"
```bash
# Your credentials are incorrect
# 1. Go to https://pesapal.com/developer
# 2. Log in to your sandbox account
# 3. Find API keys section
# 4. Generate new keys if needed
# 5. Update .env with new keys
```

### Test Fails: "Network error"
```bash
# Check internet connection
# Try pinging Pesapal API:
curl https://cybjqa.pesapal.com/pesapalv3/api/Auth/RequestToken \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"consumer_key":"test","consumer_secret":"test"}'
```

### Payment Popup Doesn't Open
```javascript
// Check browser console for errors
// Make sure popup blockers are disabled
// Check redirect URL in test output
```

## What Gets Tested

✅ **JWT Token Generation**
- Creates properly formatted JWT with HS256 signature
- Includes correct claims (iss, sub, aud, iat, exp)
- Token is accepted by Pesapal API

✅ **Order Initialization**
- Successfully submits order to Pesapal v3 API
- Receives order tracking ID
- Gets iframe redirect URL for payment

✅ **Payment Status Checking**
- Queries Pesapal for transaction status
- Maps Pesapal status to local status
- Returns correct payment details (amount, method, etc.)

✅ **Webhook Verification**
- Creates valid HMAC-SHA256 signature
- Verifies signature matches payload
- Ensures webhook authenticity in production

## Database Changes

After successful payment:
```json
{
  "pendingPayments": {
    "abc123": {
      "uid": "user123",
      "email": "user@example.com",
      "amount": 200,
      "provider": "pesapal",
      "status": "COMPLETED",  // Changed from PENDING
      "type": "USER",
      "orderTrackingId": "pesapal_order_123",
      "createdAt": "2024-06-10T10:00:00Z",
      "updatedAt": "2024-06-10T10:05:00Z"
    }
  }
}
```

## API Endpoints

### Initialize Payment (Authenticated)
```bash
curl -X POST http://localhost:5000/api/payments/pesapal/init \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json"

# Response:
{
  "ok": true,
  "pendingId": "abc123",
  "iframeUrl": "https://cybjqa.pesapal.com/..."
}
```

### Initialize Payment (Guest)
```bash
curl -X POST http://localhost:5000/api/payments/pesapal/init/guest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phoneNumber": "254700000000",
    "country": "KE"
  }'
```

### Check Payment Status
```bash
curl http://localhost:5000/api/payments/pesapal/status/abc123

# Response:
{
  "ok": true,
  "pendingId": "abc123",
  "status": "PENDING",  // or COMPLETED, FAILED
  "pesapalData": {
    "orderTrackingId": "pesapal_order_123",
    "status": "PENDING",
    "paymentMethod": "MPESA",
    "amount": 200
  }
}
```

### Simulate Webhook (Dev Only)
```bash
curl -X POST http://localhost:5000/api/payments/pesapal/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "pendingId": "abc123",
    "status": "SUCCESS"
  }'

# Response:
{
  "ok": true,
  "pendingId": "abc123",
  "status": "COMPLETED"
}
```

## Next: Production Deployment

Once testing is complete:

1. Get **production** credentials from Pesapal
2. Update environment variables:
   ```env
   PESAPAL_ENV=production
   PESAPAL_CONSUMER_KEY=your_production_key
   PESAPAL_CONSUMER_SECRET=your_production_secret
   PESAPAL_CALLBACK_URL=https://yourdomain.com/api/payments/pesapal/webhook
   PESAPAL_WEBHOOK_SECRET=your_webhook_secret
   ```

3. Test in production environment with small payment

4. Monitor logs for any issues

5. Set up alerting for failed transactions

## Support Resources

- **Test Account**: https://pesapal.com/developer
- **API Docs**: https://developer.pesapal.com/
- **Sandbox Credentials**: Found in your developer dashboard
- **Test Payment Methods**: Available in sandbox environment
