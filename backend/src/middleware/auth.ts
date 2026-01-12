import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppRole } from '../types/index.js';

const prisma = new PrismaClient();

type Role = AppRole;

interface RoleResult {
  role: Role;
  playerId?: string; // Set when role is 'player' (cached from lookup)
}

// Get the effective role for this user
async function getEffectiveRole(userId: string): Promise<RoleResult | undefined> {
  // Check Staff table first (admin/staff)
  const staff = await prisma.staff.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (staff) {
    // StaffRole enum is 'ADMIN' | 'STAFF', convert to lowercase for AppRole
    return { role: staff.role.toLowerCase() as Role };
  }

  // Not staff - check Player table
  const player = await prisma.player.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });

  if (player) {
    return { role: 'player', playerId: player.id };
  }

  // User exists in Clerk but not in our database yet
  return undefined;
}

export function requireRole(roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await getEffectiveRole(userId);

      if (!result || !roles.includes(result.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Attach auth context to request for downstream use
      req.authContext = {
        userId,
        role: result.role,
        playerId: result.playerId, // Only set for players (optimization)
      };

      // Expose role to frontend via response header
      res.setHeader('X-User-Role', result.role);

      next();
    } catch (error) {
      console.error('Error checking authorization:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
