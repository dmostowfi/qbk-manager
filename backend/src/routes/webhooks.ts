import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { PrismaClient, MembershipType } from '@prisma/client';
import Stripe from 'stripe';
import { stripeService } from '../services/stripeService.js';
import { teamPaymentService } from '../services/teamPaymentService.js';

const router = Router();
const prisma = new PrismaClient();
const EMPLOYEE_EMAIL_DOMAIN = process.env.EMPLOYEE_EMAIL_DOMAIN;

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
  };
  type: string;
}

router.post('/clerk', async (req: Request, res: Response) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get headers for verification
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // Verify webhook signature
  const wh = new Webhook(webhookSecret);
  let evt: ClerkUserEvent;

  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      console.error('No email in user.created event');
      return res.status(400).json({ error: 'No email provided' });
    }

    try {
      // Employee domain → create Staff record
      if (EMPLOYEE_EMAIL_DOMAIN && email.endsWith(EMPLOYEE_EMAIL_DOMAIN)) {
        const existingStaff = await prisma.staff.findFirst({
          where: {
            OR: [{ email }, { clerkId: id }],
          },
        });

        if (existingStaff) {
          // Link existing staff to Clerk account if not already linked
          if (!existingStaff.clerkId) {
            await prisma.staff.update({
              where: { id: existingStaff.id },
              data: { clerkId: id },
            });
            console.log(`Linked existing staff ${email} to Clerk ID ${id}`);
          }
          return res.status(200).json({ success: true, message: 'Staff already exists' });
        }

        // Create new staff record
        const staff = await prisma.staff.create({
          data: {
            clerkId: id,
            email,
            firstName: first_name || '',
            lastName: last_name || '',
            role: 'STAFF', // Default to STAFF, promote to ADMIN via UI later
          },
        });

        console.log(`Created staff ${email} with Clerk ID ${id}`);
        return res.status(200).json({ success: true, staffId: staff.id });
      }

      // Non-employee → create Player record
      const existingPlayer = await prisma.player.findFirst({
        where: {
          OR: [{ email }, { clerkId: id }],
        },
      });

      if (existingPlayer) {
        // Link existing player to Clerk account if not already linked
        if (!existingPlayer.clerkId) {
          await prisma.player.update({
            where: { id: existingPlayer.id },
            data: { clerkId: id },
          });
          console.log(`Linked existing player ${email} to Clerk ID ${id}`);
        }
        return res.status(200).json({ success: true, message: 'Player already exists' });
      }

      // Create new player
      const player = await prisma.player.create({
        data: {
          clerkId: id,
          email,
          firstName: first_name || '',
          lastName: last_name || '',
          membershipType: 'NONE',
          membershipStatus: 'ACTIVE',
          classCredits: 0,
          dropInCredits: 0,
        },
      });

      console.log(`Created player ${email} with Clerk ID ${id}`);
      return res.status(200).json({ success: true, playerId: player.id });
    } catch (error) {
      console.error('Error creating user record:', error);
      return res.status(500).json({ error: 'Failed to create user record' });
    }
  }

  // Return 200 for unhandled events (Clerk expects this)
  return res.status(200).json({ success: true, message: `Unhandled event: ${eventType}` });
});

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    event = stripeService.constructWebhookEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutExpired(session);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Invoice payment failed:', invoice.id);
      // Could implement retry logic or notifications here
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return res.status(200).json({ received: true });
});

/**
 * Handle successful checkout - apply product effects to player
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const sessionId = session.id;

  // Check if this is a team payment (has type: 'team_payment' in metadata)
  if (session.metadata?.type === 'team_payment') {
    await teamPaymentService.handlePaymentComplete(sessionId);
    return;
  }

  // Otherwise, handle as regular product purchase
  const playerId = session.metadata?.playerId;

  if (!playerId) {
    console.error('No playerId in checkout session metadata:', sessionId);
    return;
  }

  // Find the pending transaction
  const transaction = await prisma.transaction.findUnique({
    where: { stripeSessionId: sessionId },
  });

  if (!transaction) {
    console.error('No transaction found for session:', sessionId);
    return;
  }

  if (transaction.status === 'COMPLETED') {
    console.log('Transaction already completed:', sessionId);
    return;
  }

  try {
    // Retrieve the full session with line items to get product info
    const fullSession = await stripeService.retrieveCheckoutSession(sessionId);
    const lineItem = fullSession.line_items?.data[0];

    if (!lineItem) {
      console.error('No line items in checkout session:', sessionId);
      return;
    }

    const product = lineItem.price?.product as Stripe.Product;
    const metadata = product.metadata;

    console.log('Processing checkout for product:', product.name, 'metadata:', metadata);

    // Apply effects based on metadata
    const updates: any = {};

    if (metadata.membershipType) {
      updates.membershipType = metadata.membershipType as MembershipType;
      updates.membershipStatus = 'ACTIVE';
      updates.statusUpdatedAt = new Date();

      // Store subscription ID if this is a subscription
      if (session.subscription) {
        updates.stripeSubscriptionId = session.subscription as string;
      }
    }

    if (metadata.classCredits) {
      updates.classCredits = {
        increment: parseInt(metadata.classCredits, 10),
      };
    }

    if (metadata.dropInCredits) {
      updates.dropInCredits = {
        increment: parseInt(metadata.dropInCredits, 10),
      };
    }

    // Update player with effects
    if (Object.keys(updates).length > 0) {
      await prisma.player.update({
        where: { id: playerId },
        data: updates,
      });
      console.log('Applied effects to player:', playerId, updates);
    }

    // Mark transaction as completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });

    console.log('Checkout completed successfully:', sessionId);
  } catch (error) {
    console.error('Error processing checkout completion:', error);
  }
}

/**
 * Handle expired checkout - mark transaction as failed
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  // Check if this is a team payment
  if (session.metadata?.type === 'team_payment') {
    await teamPaymentService.handlePaymentExpired(session.id);
    return;
  }

  // Otherwise, handle as regular transaction
  const transaction = await prisma.transaction.findUnique({
    where: { stripeSessionId: session.id },
  });

  if (transaction && transaction.status === 'PENDING') {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED' },
    });
    console.log('Checkout expired, marked as failed:', session.id);
  }
}

/**
 * Handle subscription cancellation - update player membership status
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const player = await prisma.player.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (player) {
    await prisma.player.update({
      where: { id: player.id },
      data: {
        membershipStatus: 'CANCELLED',
        statusUpdatedAt: new Date(),
        stripeSubscriptionId: null,
      },
    });
    console.log('Subscription cancelled for player:', player.id);
  }
}

export default router;
