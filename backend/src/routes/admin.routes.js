import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import adminRequired from '../middleware/adminRequired.js';

const router = Router();

// Admin login (no token required)
router.post('/login', adminController.login);

// All other routes require admin token
router.get('/users/search', adminRequired, adminController.searchUsers);
router.get('/users/:uid', adminRequired, adminController.getUserDetails);
router.post('/withdrawals/update', adminRequired, adminController.updateWithdrawal);
router.post('/users/fund', adminRequired, adminController.fundUser);
router.get('/withdrawals/pending', adminRequired, adminController.getPendingWithdrawals);
router.get('/stats', adminRequired, adminController.getDashboardStats);

export default router;
