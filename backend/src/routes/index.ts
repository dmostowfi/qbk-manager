import { Router } from 'express';
import eventsRouter from './events.js';
import playersRouter from './players.js';
import meRouter from './me.js';
import webhooksRouter from './webhooks.js';
import productsRouter from './products.js';
import checkoutRouter from './checkout.js';

const router = Router();

router.use('/events', eventsRouter);
router.use('/players', playersRouter);
router.use('/me', meRouter);
router.use('/webhooks', webhooksRouter);
router.use('/products', productsRouter);
router.use('/checkout', checkoutRouter);

export default router;
