import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export interface ProductWithPrice {
  id: string;
  name: string;
  description: string | null;
  metadata: Stripe.Metadata;
  price: {
    id: string;
    unitAmount: number | null;
    currency: string;
    recurring: Stripe.Price.Recurring | null;
  } | null;
}

export const stripeService = {
  /**
   * List all active products with their default prices
   */
  async listProducts(): Promise<ProductWithPrice[]> {
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    return products.data.map((product) => {
      const price = product.default_price as Stripe.Price | null;
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        price: price
          ? {
              id: price.id,
              unitAmount: price.unit_amount,
              currency: price.currency,
              recurring: price.recurring,
            }
          : null,
      };
    });
  },

  /**
   * Get a single product by ID with metadata
   */
  async getProduct(productId: string): Promise<Stripe.Product> {
    return stripe.products.retrieve(productId);
  },

  /**
   * Get or create a Stripe customer for a player
   */
  async getOrCreateCustomer(
    playerId: string,
    email: string,
    name: string,
    existingCustomerId?: string | null
  ): Promise<string> {
    if (existingCustomerId) {
      return existingCustomerId;
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { playerId },
    });

    return customer.id;
  },

  /**
   * Create a Checkout Session for a product
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    playerId: string;
    successUrl: string;
    cancelUrl: string;
    mode: 'payment' | 'subscription';
  }): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.create({
      customer: params.customerId,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: params.mode,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        playerId: params.playerId,
      },
    });
  },

  /**
   * Construct and verify a Stripe webhook event
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  },

  /**
   * Retrieve a checkout session with line items expanded
   */
  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product'],
    });
  },
};

export default stripeService;
