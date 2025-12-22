import { Router } from 'express';
import eventsController from '../controllers/eventsController.js';

const router = Router();

router.get('/', eventsController.getAll);
router.get('/:id', eventsController.getById);
router.post('/', eventsController.create);
router.put('/:id', eventsController.update);
router.delete('/:id', eventsController.delete);

export default router;
