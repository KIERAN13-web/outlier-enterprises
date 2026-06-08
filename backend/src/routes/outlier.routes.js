import { Router } from 'express';
import outlierController from '../controllers/outlier.controller.js';
import authRequired from '../middleware/authRequired.js';
import paymentRequired from '../middleware/paymentRequired.js';

const router = Router();

// Run analysis on selected accounts (or on a default pool query)
router.post('/book', authRequired, paymentRequired, outlierController.createOutlierBook);

export default router;

