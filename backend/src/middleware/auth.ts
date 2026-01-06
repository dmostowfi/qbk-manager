import { getAuth, clerkClient } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppRole } from '../types/index.js';

const prisma = new PrismaClient();

type Role = AppRole;

const QBK_ORG_ID = process.env.CLERK_ORG_ID;

// Map Clerk org roles to our app roles
const orgRoleToAppRole: Record<string, 'admin' | 'staff'> = {
  'org:admin': 'admin',
  'org:member': 'staff',
};

interface RoleResult {
  role: Role;
  playerId?: string; // Set when role is 'player' and acting on self
}

// Get the effective role for this request
async function getEffectiveRole(
  userId: string,
  targetPlayerId?: string
): Promise<RoleResult | undefined> {
  // Check org membership first (admin/staff)
  if (QBK_ORG_ID) {
    const orgList = await clerkClient.users.getOrganizationMembershipList({ userId });
    const qbkStaff = orgList.data.find(entry => entry.organization.id === QBK_ORG_ID);

    if (qbkStaff) {
      const orgRole = orgRoleToAppRole[qbkStaff.role];
      if (orgRole) return { role: orgRole };
    }
  }

  // Not staff - check if user has a Player record
  const player = await prisma.player.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });

  if (player) {
    // If targetPlayerId specified, must match (ownership check)
    if (targetPlayerId && player.id !== targetPlayerId) {
      return undefined; // Trying to act on someone else's data
    }
    return { role: 'player', playerId: player.id };
  }

  // No valid role for this action
  return undefined;
}

type TargetPlayerIdExtractor = (req: Request) => string | undefined;

export function requireRole(
  roles: Role[],
  getTargetPlayerId?: TargetPlayerIdExtractor
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const targetPlayerId = getTargetPlayerId?.(req);
      const result = await getEffectiveRole(userId, targetPlayerId);

      if (!result || !roles.includes(result.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Attach auth context to request for downstream use
      req.authContext = {
        userId,
        role: result.role,
        playerId: result.playerId,
      };

      next();
    } catch (error) {
      console.error('Error checking authorization:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Convenience shorthand for staff-only routes
export const requireStaff = requireRole(['admin', 'staff']);
