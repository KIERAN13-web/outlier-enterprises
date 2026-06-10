# Pesapal v3 Integration Guide

## Overview

This guide covers the complete Pesapal v3 integration for the chat-app payment system. The v3 API uses JWT authentication instead of the legacy OAuth 1.0 HMAC-SHA1 approach.

## Architecture

### Key Components

1. **Backend Controller** (`backend/src/controllers/pesapal.controller.js`)
   - JWT token generation and management
   - Order submission to Pesapal
   - Payment status checking
   - Webhook handling with signature verification

2. **API Routes** (`backend/src/routes/pesapal.routes.js`)
   - `POST /payments/pesapal/init` - Authenticated user payment
   - `POST /payments/pesapal/init/guest` - Guest user payment
   - `GET /payments/pesapal/status/:pendingId` - Check payment status
   - `POST /payments/pesapal/webhook` - Webhook receiver
   - `POST /payments/pesapal/webhook/simulate` - Development webhook simulation

3. **Frontend API** (`src/api/paymentApi.js`)
   - `createPesapalInit(token)` - Initialize authenticated payment
   - `createPesapalGuest(data)` - Initialize guest payment
   - `getPesapalPaymentStatus(pendingId)` - Check payment status
   - `simulatePesapalWebhook(pendingId, status)` - Simulate webhook (dev)

4. **Payment Flow** (`src/pages/Payment.jsx`)
   - Provider selection (M-Pesa vs Pesapal)
   - Pesapal iframe opening
   - Payment status checking

## Environment Configuration

### Required Variables

```env
# Pesapal Credentials
PESAPAL_CONSUMER_KEY=your_api_key
PESAPAL_CONSUMER_SECRET=your_api_secret

# Environment (sandbox or production)
PESAPAL_ENV=sandbox

# Webhook Configuration (optional)
PESAPAL_CALLBACK_URL=https://your-domain.com/api/payments/pesapal/webhook
PESAPAL_WEBHOOK_SECRET=your_webhook_secret
```

### Environment Setup

1. **Development (Sandbox)**
   ```env
   PESAPAL_ENV=sandbox
   ```
   Uses: `https://cybjqa.pesapal.com/pesapalv3/api`

2. **Production**
   ```env
   PESAPAL_ENV=production
   ```
   Uses: `https://pay.pesapal.com/v3/api`

## Testing the Integration

### 1. Run Sandbox Test Script

```bash
# First, ensure your .env has valid credentials
node backend/tests/pesapal-sandbox-test.js
```

This script will:
- ✅ Validate configuration
- ✅ Test JWT token generation
- ✅ Test order initialization
- ✅ Test payment status checking
- ✅ Test webhook signature verification

**Expected Output:**
```
🚀 PESAPAL V3 SANDBOX INTEGRATION TEST
✅ Access Token Obtained
✅ Transaction Initiated (Order: xxxxx)
✅ Transaction Status Retrieved
✅ Webhook Signature Verified
```

### 2. Manual Testing in Browser

1. Start the development server:
   ```bash
   npm start
   ```

2. Navigate to Payment page (`/payment`)

3. Select "Pesapal" as payment method

4. Click "Pay with Pesapal"

5. A popup will open with Pesapal payment iframe

6. In development, you'll see a "Simulate payment completion" button on the status page

### 3. API Endpoints Testing

**Initialize Payment:**
```bash
curl -X POST http://localhost:5000/api/payments/pesapal/init \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Check Payment Status:**
```bash
curl http://localhost:5000/api/payments/pesapal/status/PENDING_ID
```

**Simulate Webhook (Development Only):**
```bash
curl -X POST http://localhost:5000/api/payments/pesapal/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{"pendingId": "PENDING_ID", "status": "SUCCESS"}'
```

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (User)                       │
├─────────────────────────────────────────────────────────┤
│ 1. User clicks "Pay with Pesapal"                       │
│ 2. Frontend sends POST /api/payments/pesapal/init       │
│ 3. Receives iframe URL and pendingId                    │
│ 4. Opens Pesapal payment iframe in popup                │
│ 5. User completes payment in Pesapal                    │
│ 6. Polls GET /api/payments/pesapal/status/:pendingId    │
│ 7. On completion, redirects to dashboard                │
└─────────────────────────────────────────────────────────┘
         │                                    ▲
         │                                    │
         ├─────────────────────────────────────┤
         │                                    │
         ▼                                    │
┌─────────────────────────────────────────────────────────┐
│                    Backend (Server)                      │
├─────────────────────────────────────────────────────────┤
│ POST /payments/pesapal/init                             │
│ 1. Validate JWT token                                   │
│ 2. Generate Pesapal JWT                                 │
│ 3. Request access token from Pesapal                    │
│ 4. Submit order to Pesapal v3 API                       │
│ 5. Store order in Firebase                              │
│ 6. Return iframe URL and pendingId                      │
│                                                         │
│ GET /payments/pesapal/status/:pendingId                 │
│ 1. Fetch pending payment from database                  │
│ 2. Query Pesapal API for current status                 │
│ 3. Update database if status changed                    │
│ 4. Return status to frontend                            │
│                                                         │
│ POST /payments/pesapal/webhook (Production)             │
│ 1. Verify webhook signature                             │
│ 2. Extract payment status from webhook                  │
│ 3. Update pending payment status                        │
│ 4. Trigger account creation if successful               │
└─────────────────────────────────────────────────────────┘
         │
         │ (Optional: Webhook from Pesapal)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Pesapal v3 API                        │
├─────────────────────────────────────────────────────────┤
│ - Uses JWT Bearer token authentication                  │
│ - Endpoints: InitiateTransaction, GetTransactionStatus  │
│ - Currency: KES (Kenyan Shilling)                       │
│ - Supports multiple payment methods                     │
└─────────────────────────────────────────────────────────┘
```

## Error Handling

### Logging

All Pesapal operations are logged with `[Pesapal]` prefix:

```javascript
// Examples
[Pesapal] Requesting token from sandbox environment
[Pesapal] Submitting order TEST_1234 for amount 200 KES
[Pesapal] Status for order123: COMPLETED
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Missing PESAPAL_CONSUMER_KEY | Credentials not configured | Add to .env file |
| Token request failed: HTTP 401 | Invalid credentials | Verify keys in Pesapal dashboard |
| No order_tracking_id | API response invalid | Check network, try again |
| Webhook signature mismatch | Tampered webhook | Verify PESAPAL_WEBHOOK_SECRET |
| Status from cache (API unavailable) | Pesapal API down | Uses cached status, retry later |

## Webhook Verification

In production, all webhooks must be verified using signature validation:

```javascript
// Pesapal sends webhook with X-Pesapal-Signature header
// Server verifies using HMAC-SHA256

const hash = crypto
  .createHmac('sha256', PESAPAL_WEBHOOK_SECRET)
  .update(JSON.stringify(webhookBody))
  .digest('base64');

if (hash !== webhookSignature) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### Production Checklist

- [ ] Set `PESAPAL_ENV=production`
- [ ] Set `PESAPAL_CONSUMER_KEY` (production credentials)
- [ ] Set `PESAPAL_CONSUMER_SECRET` (production credentials)
- [ ] Set `PESAPAL_CALLBACK_URL` to your production domain
- [ ] Set `PESAPAL_WEBHOOK_SECRET` from Pesapal dashboard
- [ ] Enable webhook signature verification
- [ ] Test with real payments (small amount)
- [ ] Monitor logs for any errors
- [ ] Set up alerting for failed webhooks

## Development Features

### Webhook Simulation

In development (non-production), you can simulate webhook callbacks:

```bash
# Mark order as completed
curl -X POST http://localhost:5000/api/payments/pesapal/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{"pendingId": "abc123", "status": "SUCCESS"}'

# Mark order as failed
curl -X POST http://localhost:5000/api/payments/pesapal/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{"pendingId": "abc123", "status": "FAILED"}'
```

### Status Polling

Frontend polls every 3 seconds for payment status updates:

```javascript
// PaymentStatus.jsx
const intervalId = setInterval(fetchStatus, 3000);
```

This allows for immediate feedback without waiting for webhooks.

## Troubleshooting

### 1. Token Request Fails

```
[Pesapal] Token request failed: HTTP 400
```

**Check:**
- Credentials are correct in .env
- Environment is set correctly (sandbox vs production)
- Internet connection is working
- Pesapal API is not down

### 2. Order Initialization Fails

```
[Pesapal] Order submission failed: HTTP 422
```

**Check:**
- All required fields are provided
- Amount is valid (positive number)
- Email format is correct
- Callback URL is reachable

### 3. Status Checking Returns Cache

```
Status from cache (API unavailable)
```

**This is normal when:**
- Pesapal API is temporarily unavailable
- Network issue occurs
- Using cached status is safe - polling will retry

### 4. Webhook Not Received

**Check:**
- PESAPAL_CALLBACK_URL is publicly accessible
- PESAPAL_CALLBACK_URL matches Pesapal webhook configuration
- Firewall allows POST requests
- SSL certificate is valid (production)

## Integration with Account Creation

When payment is completed:

1. Webhook updates pendingPayment status to "COMPLETED"
2. Frontend detects status change and redirects to login
3. User can now login with credentials used during registration
4. User account is created in Firebase Auth

## Database Schema

```
pendingPayments/{pendingId}
├── uid (authenticated users only)
├── email
├── password (guests only)
├── amount: 200
├── provider: "pesapal"
├── status: "PENDING" | "COMPLETED" | "FAILED"
├── type: "USER" | "GUEST"
├── orderTrackingId: "pesapal_order_id"
├── createdAt: ISO timestamp
└── updatedAt: ISO timestamp

pendingUsers/{pendingId}
├── email
├── phoneNumber
├── name
├── status: "PENDING" | "COMPLETED" | "FAILED"
├── provider: "pesapal"
├── orderTrackingId: "pesapal_order_id"
├── createdAt: ISO timestamp
└── updatedAt: ISO timestamp
```

## Performance Optimization

### Caching

- Access tokens are cached in memory (1-hour expiration)
- Payment status is cached in Firebase
- Reduces API calls to Pesapal

### Polling Strategy

- Frontend polls every 3 seconds (configurable)
- Falls back to cached status if API unavailable
- Stops polling once status is COMPLETED or FAILED

## Next Steps

1. ✅ Test with sandbox credentials
2. ✅ Verify webhook simulation works
3. ✅ Deploy to staging
4. ✅ Get production credentials from Pesapal
5. ✅ Configure production environment variables
6. ✅ Test real payment with small amount
7. ✅ Deploy to production

## Support

- Pesapal Documentation: https://pesapal.com/developer
- API Reference: https://developer.pesapal.com/
- Sandbox: https://cybjqa.pesapal.com
- Production: https://pay.pesapal.com
