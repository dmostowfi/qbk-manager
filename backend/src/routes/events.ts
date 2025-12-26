import { Router } from 'express';
import eventsController from '../controllers/eventsController.js';
import enrollmentController from '../controllers/enrollmentController.js';

const router = Router();

router.get('/', eventsController.getAll);
router.get('/:id', eventsController.getById);
router.post('/', eventsController.create);
router.put('/:id', eventsController.update);
router.delete('/:id', eventsController.delete);

// Enrollment routes
router.post('/:id/enroll', enrollmentController.enroll);
router.delete('/:id/enroll/:enrollmentId', enrollmentController.unenroll);

export default router;
