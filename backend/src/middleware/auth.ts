import { getAuth, clerkClient } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Role = 'admin' | 'staff' | 'player';

const QBK_ORG_ID = process.env.CLERK_ORG_ID;

// Map Clerk org roles to our app roles
const orgRoleToAppRole: Record<string, 'admin' | 'staff'> = {
  'org:admin': 'admin',
  'org:member': 'staff',
};

// Get the effective role for this request
async function getEffectiveRole(
  userId: string,
  targetPlayerId?: string
): Promise<Role | undefined> {
  // Check org membership first (admin/staff)
  if (QBK_ORG_ID) {
    const orgList = await clerkClient.users.getOrganizationMembershipList({ userId });
    const qbkStaff = orgList.data.find(entry => entry.organization.id === QBK_ORG_ID);

    if (qbkStaff) {
      const orgRole = orgRoleToAppRole[qbkStaff.role];
      if (orgRole) return orgRole;
    }
  }

  // Not staff - check if acting on self (player role)
  if (targetPlayerId) {
    const player = await prisma.player.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (player?.id === targetPlayerId) return 'player';
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
      const role = await getEffectiveRole(userId, targetPlayerId);

      if (!role || !roles.includes(role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (error) {
      console.error('Error checking authorization:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Convenience shorthand for staff-only routes
export const requireStaff = requireRole(['admin', 'staff']);
