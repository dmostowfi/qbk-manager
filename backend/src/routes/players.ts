import { Router } from 'express';
import playersController from '../controllers/playersController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Admin/Staff only
router.get('/', requireRole('ADMIN', 'STAFF'), playersController.getAll);
router.get('/:id', requireRole('ADMIN', 'STAFF'), playersController.getById);
router.put('/:id', requireRole('ADMIN', 'STAFF'), playersController.update);

// POST removed - players created via Clerk webhook
// DELETE removed - no player deletion allowed

export default router;
