import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import authRequired from '../middleware/authRequired.js';
import paymentRequired from '../middleware/paymentRequired.js';

const router = Router();

router.get('/accounts', authRequired, paymentRequired, dashboardController.getAccountPool);

export default router;

