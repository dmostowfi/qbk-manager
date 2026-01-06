import { getAuth } from '@clerk/express';
import { Request } from 'express';
import { PrismaClient, Player } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get the Clerk userId from the request
 * Returns null if not authenticated
 */
export function getAuthUserId(req: Request): string | null {
  const { userId } = getAuth(req);
  return userId;
}

/**
 * Get the authenticated user's Player record
 * Returns null if not authenticated or no linked player
 */
export async function getAuthPlayer(req: Request): Promise<Player | null> {
  const userId = getAuthUserId(req);
  if (!userId) return null;

  return prisma.player.findUnique({
    where: { clerkId: userId },
  });
}

/**
 * Require the authenticated user's Player record
 * Throws if not authenticated or no linked player
 */
export async function requireAuthPlayer(req: Request): Promise<Player> {
  const player = await getAuthPlayer(req);
  if (!player) {
    throw new Error('Authenticated player not found');
  }
  return player;
}
