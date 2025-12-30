import { Router } from 'express';
import eventsController from '../controllers/eventsController.js';
import enrollmentController from '../controllers/enrollmentController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', eventsController.getAll);
router.get('/:id', eventsController.getById);

// Admin/Staff only
router.post('/', requireRole('ADMIN', 'STAFF'), eventsController.create);
router.put('/:id', requireRole('ADMIN', 'STAFF'), eventsController.update);
router.delete('/:id', requireRole('ADMIN', 'STAFF'), eventsController.delete);

// Enrollment routes - Admin/Staff only
router.post('/:id/enroll', requireRole('ADMIN', 'STAFF'), enrollmentController.enroll);
router.delete('/:id/enroll/:enrollmentId', requireRole('ADMIN', 'STAFF'), enrollmentController.unenroll);

export default router;
