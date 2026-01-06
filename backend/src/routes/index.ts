import { Router } from 'express';
import eventsRouter from './events.js';
import playersRouter from './players.js';
import meRouter from './me.js';
import webhooksRouter from './webhooks.js';

const router = Router();

router.use('/events', eventsRouter);
router.use('/players', playersRouter);
router.use('/me', meRouter);
router.use('/webhooks', webhooksRouter);

export default router;
