import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import authRequired from '../middleware/authRequired.js';

const router = Router();

router.get('/accounts', authRequired, dashboardController.getAccountPool);

export default router;

