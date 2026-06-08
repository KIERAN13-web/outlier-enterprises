import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import authRequired from '../middleware/authRequired.js';

const router = Router();

// Create an M-Pesa STK push for the current user (paid amount fixed to 200 for now)
router.post('/mpesa/stk-push', authRequired, paymentController.createStkPush);

// Guest STK push: accept email/password/phone for users who haven't been created yet.
router.post('/mpesa/stk-push/guest', paymentController.createStkPushGuest);

// Webhook/callback endpoint from M-Pesa.
// Payment provider will POST payment result here.
router.post('/mpesa/webhook', paymentController.mpesaWebhook);

// Local dev helper: simulate webhook callbacks when using the placeholder payment provider.
router.post('/mpesa/webhook/simulate', paymentController.simulateMpesaWebhook);

// Local dev helper: bypass payment and create the guest account immediately.
router.post('/mpesa/bypass', paymentController.bypassGuestPayment);

// Check guest payment status while waiting for confirmation.
router.get('/mpesa/status/:pendingId', paymentController.getPaymentStatus);

// Get user's orders
router.get('/orders', authRequired, paymentController.getUserOrders);

// Place an order for an account
router.post('/orders', authRequired, paymentController.placeOrder);

export default router;

