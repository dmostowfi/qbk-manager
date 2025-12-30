import { Router } from 'express';
import eventsRouter from './events.js';
import playersRouter from './players.js';
import webhooksRouter from './webhooks.js';

const router = Router();

router.use('/events', eventsRouter);
router.use('/players', playersRouter);
router.use('/webhooks', webhooksRouter);

export default router;
