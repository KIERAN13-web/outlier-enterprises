import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import authRequired from '../middleware/authRequired.js';

const router = Router();

// Note: Firebase Auth is handled by the client. Backend verifies tokens.
// These endpoints exist mainly to sync/create user docs.
router.post('/sync', authRequired, authController.syncUser);
router.get('/status', authRequired, authController.getStatus);
router.post('/change-password', authRequired, authController.changePassword);

export default router;

