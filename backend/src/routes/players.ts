import { Router } from 'express';
import playersController from '../controllers/playersController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Admin/Staff only
router.get('/', requireRole(['admin', 'staff']), playersController.getAll);
router.get('/:id', requireRole(['admin', 'staff']), playersController.getById);
router.put('/:id', requireRole(['admin', 'staff']), playersController.update);

// POST removed - players created via Clerk webhook
// DELETE removed - no player deletion allowed

export default router;
