import { Router } from 'express';
import pesapalController from '../controllers/pesapal.controller.js';
import authRequired from '../middleware/authRequired.js';

const router = Router();

// Initialize a Pesapal payment for the authenticated user
router.post('/init', authRequired, pesapalController.initPesapal);
router.post('/init/guest', pesapalController.initPesapalGuest);

// Check payment status for a pending payment
router.get('/status/:pendingId', pesapalController.checkPaymentStatus);

// Pesapal webhook endpoint (Pesapal would POST here in production)
router.get('/webhook', pesapalController.webhookHealth);
router.head('/webhook', pesapalController.webhookHealth);
router.post('/webhook', pesapalController.webhook);

// For local development, allow simulating a Pesapal webhook (will mark pending payment)
router.post('/webhook/simulate', pesapalController.simulateWebhook);

export default router;
