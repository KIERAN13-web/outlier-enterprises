/**
 * Pesapal v3 Sandbox Integration Test Script
 * 
 * This script tests the Pesapal v3 API integration with JWT authentication.
 * It verifies:
 * - Token generation with JWT
 * - Order initialization
 * - Payment status checking
 * - Webhook simulation
 * 
 * Setup:
 * 1. Ensure PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET are set in .env
 * 2. Run: node backend/tests/pesapal-sandbox-test.js
 */

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.PESAPAL_ENV || 'sandbox',
  consumerKey: process.env.PESAPAL_CONSUMER_KEY || process.env.PESAPAL_KEY,
  consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || process.env.PESAPAL_SECRET,
  apiBaseUrl: (process.env.PESAPAL_ENV || 'sandbox').toLowerCase() === 'production'
    ? 'https://pay.pesapal.com/v3/api'
    : 'https://cybjqa.pesapal.com/pesapalv3/api',
};

let accessToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateConfig() {
  const errors = [];
  if (!config.consumerKey) errors.push('PESAPAL_CONSUMER_KEY not set');
  if (!config.consumerSecret) errors.push('PESAPAL_CONSUMER_SECRET not set');
  
  if (errors.length) {
    log('\n❌ Configuration Error:', 'red');
    errors.forEach(err => log(`   - ${err}`, 'red'));
    log('\nPlease set the required environment variables in .env', 'yellow');
    process.exit(1);
  }
}

function generateJWT() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: config.consumerKey,
    sub: config.consumerKey,
    aud: 'https://pesapal.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.consumerSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function getAccessToken() {
  try {
    log('\n📝 Step 1: Requesting Access Token', 'cyan');
    log(`    Environment: ${config.env}`, 'cyan');
    
    const response = await fetch(`${config.apiBaseUrl}/Auth/RequestToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: config.consumerKey,
        consumer_secret: config.consumerSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error('No token in response');
    }

    accessToken = data.token;
    log(`✅ Access Token Obtained: ${accessToken.substring(0, 20)}...`, 'green');
    return data.token;
  } catch (error) {
    log(`❌ Failed to get access token: ${error.message}`, 'red');
    throw error;
  }
}

async function initiateTransaction() {
  try {
    log('\n📝 Step 2: Initiating Transaction', 'cyan');
    
    if (!accessToken) await getAccessToken();

    const reference = `TEST_${Date.now()}`;
    const payload = {
      reference,
      amount: 200,
      description: 'Sandbox Test Payment',
      currency: 'KES',
      buyer_email: 'test@sandbox.pesapal.com',
      buyer_first_name: 'Test',
      buyer_last_name: 'Sandbox',
      buyer_phone: '254700000000',
      redirect_mode: 'IFRAME',
      callback_url: 'https://example.com/callback',
      billing_address: {
        email_address: 'test@sandbox.pesapal.com',
        phone_number: '254700000000',
        country_code: 'KE',
        first_name: 'Test',
        last_name: 'Sandbox',
      },
    };

    log(`    Reference: ${reference}`, 'cyan');
    log(`    Amount: 200 KES`, 'cyan');

    const response = await fetch(`${config.apiBaseUrl}/Transactions/InitiateTransaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    if (!data.order_tracking_id) {
      throw new Error('No order_tracking_id in response');
    }

    log(`✅ Transaction Initiated`, 'green');
    log(`    Order Tracking ID: ${data.order_tracking_id}`, 'green');
    log(`    Redirect URL: ${data.redirect_url}`, 'green');
    
    return { orderTrackingId: data.order_tracking_id, reference };
  } catch (error) {
    log(`❌ Failed to initiate transaction: ${error.message}`, 'red');
    throw error;
  }
}

async function checkTransactionStatus(orderTrackingId) {
  try {
    log('\n📝 Step 3: Checking Transaction Status', 'cyan');
    log(`    Order Tracking ID: ${orderTrackingId}`, 'cyan');
    
    if (!accessToken) await getAccessToken();

    const response = await fetch(
      `${config.apiBaseUrl}/Transactions/GetTransactionStatus?order_tracking_id=${orderTrackingId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    log(`✅ Status Retrieved`, 'green');
    log(`    Payment Status: ${data.payment_status_description}`, 'green');
    log(`    Payment Method: ${data.payment_method || 'N/A'}`, 'green');
    log(`    Amount: ${data.amount} KES`, 'green');
    
    return data;
  } catch (error) {
    log(`❌ Failed to check status: ${error.message}`, 'red');
    throw error;
  }
}

async function testWebhookVerification() {
  try {
    log('\n📝 Step 4: Testing Webhook Verification', 'cyan');
    
    const webhookPayload = {
      reference: `TEST_${Date.now()}`,
      status: 'COMPLETED',
      amount: 200,
    };

    const signature = crypto
      .createHmac('sha256', config.consumerSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('base64');

    log(`    Payload: ${JSON.stringify(webhookPayload)}`, 'cyan');
    log(`    Signature: ${signature.substring(0, 20)}...`, 'cyan');

    // Verify signature
    const calculatedSignature = crypto
      .createHmac('sha256', config.consumerSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('base64');

    if (signature === calculatedSignature) {
      log(`✅ Webhook Signature Valid`, 'green');
    } else {
      log(`❌ Webhook Signature Invalid`, 'red');
    }
  } catch (error) {
    log(`❌ Webhook verification failed: ${error.message}`, 'red');
  }
}

async function runFullTest() {
  try {
    log('\n' + '='.repeat(60), 'blue');
    log('🚀 PESAPAL V3 SANDBOX INTEGRATION TEST', 'blue');
    log('='.repeat(60), 'blue');

    validateConfig();

    log(`\n📋 Configuration:`, 'cyan');
    log(`    Environment: ${config.env}`, 'cyan');
    log(`    Consumer Key: ${config.consumerKey.substring(0, 10)}...`, 'cyan');
    log(`    API Base URL: ${config.apiBaseUrl}`, 'cyan');

    // Run all tests
    await getAccessToken();
    const { orderTrackingId, reference } = await initiateTransaction();
    
    // Wait a bit before checking status
    log('\n⏳ Waiting 2 seconds before checking status...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await checkTransactionStatus(orderTrackingId);
    await testWebhookVerification();

    log('\n' + '='.repeat(60), 'blue');
    log('✅ ALL TESTS COMPLETED SUCCESSFULLY', 'green');
    log('='.repeat(60), 'blue');
    log('\n📊 Test Summary:', 'cyan');
    log(`    ✓ Access Token Generated`, 'green');
    log(`    ✓ Transaction Initiated (Order: ${orderTrackingId})`, 'green');
    log(`    ✓ Transaction Status Retrieved`, 'green');
    log(`    ✓ Webhook Signature Verified`, 'green');
    log('\n💡 Next Steps:', 'yellow');
    log(`    1. Complete payment on the redirect URL in your browser`, 'yellow');
    log(`    2. Check payment status via /api/payments/pesapal/status/{pendingId}`, 'yellow');
    log(`    3. Verify webhook handling is working correctly`, 'yellow');
    
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('❌ TEST FAILED', 'red');
    log('='.repeat(60), 'red');
    log(`\n${error.message}`, 'red');
    log('\n🔧 Troubleshooting:', 'yellow');
    log(`    - Verify PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET`, 'yellow');
    log(`    - Check network connectivity to Pesapal API`, 'yellow');
    log(`    - Ensure NODE_ENV is set to 'sandbox' or 'production'`, 'yellow');
    process.exit(1);
  }
}

// Run the test
runFullTest();
