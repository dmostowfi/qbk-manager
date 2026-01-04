import { Router } from 'express';
import eventsController from '../controllers/eventsController.js';
import enrollmentController from '../controllers/enrollmentController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', eventsController.getAll);
router.get('/:id', eventsController.getById);

// Admin/Staff only
router.post('/', requireRole(['admin', 'staff']), eventsController.create);
router.put('/:id', requireRole(['admin', 'staff']), eventsController.update);
router.delete('/:id', requireRole(['admin', 'staff']), eventsController.delete);

// Enrollment routes - Admin/Staff, or player acting on themselves
router.post('/:id/enroll', requireRole(['admin', 'staff', 'player'], req => req.body.playerId || req.body.playerIds?.[0]), enrollmentController.enroll);
router.post('/:id/unenroll', requireRole(['admin', 'staff']), enrollmentController.unenroll);

export default router;
