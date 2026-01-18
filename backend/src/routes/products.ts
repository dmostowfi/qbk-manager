import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripeService.js';

const router = Router();

/**
 * GET /api/products
 * List all active products from Stripe with prices and metadata
 * Public endpoint - no auth required (players need to see products to purchase)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await stripeService.listProducts();

    // Sort products: memberships first, then by price
    const sorted = products.sort((a, b) => {
      // Memberships (recurring) first
      const aIsRecurring = a.price?.recurring !== null;
      const bIsRecurring = b.price?.recurring !== null;
      if (aIsRecurring && !bIsRecurring) return -1;
      if (!aIsRecurring && bIsRecurring) return 1;

      // Then by price (descending)
      const aPrice = a.price?.unitAmount || 0;
      const bPrice = b.price?.unitAmount || 0;
      return bPrice - aPrice;
    });

    return res.json(sorted);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;
