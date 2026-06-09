import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import adminRequired from '../middleware/adminRequired.js';

const router = Router();

// Toggle admin role (requires admin auth)
router.post('/toggle-role', adminRequired, adminController.toggleAdminRole);

// All other routes require admin token
router.get('/users/search', adminRequired, adminController.searchUsers);
router.get('/users/:uid', adminRequired, adminController.getUserDetails);
router.post('/withdrawals/update', adminRequired, adminController.updateWithdrawal);
router.put('/withdrawals/:uid/:withdrawalId/approve', adminRequired, adminController.approveWithdrawal);
router.put('/withdrawals/:uid/:withdrawalId/paid', adminRequired, adminController.markWithdrawalPaid);
router.get('/withdrawals', adminRequired, adminController.getAllWithdrawals);
router.post('/users/fund', adminRequired, adminController.fundUser);
router.get('/withdrawals/pending', adminRequired, adminController.getPendingWithdrawals);
router.get('/stats', adminRequired, adminController.getDashboardStats);

export default router;
