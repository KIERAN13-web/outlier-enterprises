import { Router } from 'express';
import taskController from '../controllers/task.controller.js';
import authRequired from '../middleware/authRequired.js';

const router = Router();

// Submit a completed task
router.post('/submit', authRequired, taskController.submitTask);

// Get a specific task
router.get('/:taskId', authRequired, taskController.getTask);

// Get all user tasks
router.get('/', authRequired, taskController.getUserTasks);

export default router;
