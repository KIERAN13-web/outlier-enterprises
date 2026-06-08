import { Router } from 'express';
import walletController from '../controllers/wallet.controller.js';
import authRequired from '../middleware/authRequired.js';

const router = Router();

// Get user's wallet information
router.get('/', authRequired, walletController.getWallet);

// Request a withdrawal
router.post('/withdraw', authRequired, walletController.withdraw);

// Get withdrawal history
router.get('/withdrawals', authRequired, walletController.getWithdrawals);

export default router;
