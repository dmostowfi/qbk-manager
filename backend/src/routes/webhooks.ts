import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { PrismaClient } from '@prisma/client';

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

    // Skip Player creation for employees (identified by email domain)
    if (EMPLOYEE_EMAIL_DOMAIN && email.endsWith(EMPLOYEE_EMAIL_DOMAIN)) {
      console.log(`Skipping Player creation for employee ${email}`);
      return res.status(200).json({ success: true, message: 'Employee account, no Player created' });
    }

    try {
      // Check if player already exists (by email or clerkId)
      const existingPlayer = await prisma.player.findFirst({
        where: {
          OR: [
            { email },
            { clerkId: id },
          ],
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
      console.error('Error creating player:', error);
      return res.status(500).json({ error: 'Failed to create player' });
    }
  }

  // Return 200 for unhandled events (Clerk expects this)
  return res.status(200).json({ success: true, message: `Unhandled event: ${eventType}` });
});

export default router;
