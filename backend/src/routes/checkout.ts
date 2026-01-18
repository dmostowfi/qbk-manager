import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { requireRole } from '../middleware/auth.js';
import { stripeService } from '../services/stripeService.js';

const router = Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const APP_URL = process.env.APP_URL || 'http://localhost:8081';

/**
 * POST /api/checkout/session
 * Create a Stripe Checkout session for a product
 * Requires player authentication
 */
router.post(
  '/session',
  requireRole(['player']),
  async (req: Request, res: Response) => {
    const { priceId } = req.body;
    const playerId = req.authContext?.playerId;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID not found' });
    }

    try {
      // Get player info
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          stripeCustomerId: true,
        },
      });

      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Get or create Stripe customer
      const customerId = await stripeService.getOrCreateCustomer(
        player.id,
        player.email,
        `${player.firstName} ${player.lastName}`,
        player.stripeCustomerId
      );

      // Update player with Stripe customer ID if new
      if (!player.stripeCustomerId) {
        await prisma.player.update({
          where: { id: player.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Fetch the price and product to determine mode and get product info
      const priceData = await stripe.prices.retrieve(priceId);
      const productId = priceData.product as string;
      const product = await stripe.products.retrieve(productId);

      const isSubscription = priceData.type === 'recurring';

      // Create checkout session
      const session = await stripeService.createCheckoutSession({
        customerId,
        priceId,
        playerId: player.id,
        successUrl: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${APP_URL}/checkout/cancel`,
        mode: isSubscription ? 'subscription' : 'payment',
      });

      // Create pending transaction with product name
      await prisma.transaction.create({
        data: {
          playerId: player.id,
          stripeProductId: productId,
          productName: product.name,
          stripeSessionId: session.id,
          amount: (priceData.unit_amount || 0) / 100, // Convert cents to dollars
          status: 'PENDING',
        },
      });

      return res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

export default router;
