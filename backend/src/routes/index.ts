import { Router } from 'express';
import eventsRouter from './events.js';
import playersRouter from './players.js';

const router = Router();

router.use('/events', eventsRouter);
router.use('/players', playersRouter);

export default router;
