import { Router } from 'express';
import playersController from '../controllers/playersController.js';

const router = Router();

router.get('/', playersController.getAll);
router.get('/:id', playersController.getById);
router.post('/', playersController.create);
router.put('/:id', playersController.update);
router.delete('/:id', playersController.delete);

export default router;
