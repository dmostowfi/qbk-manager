import { getAuth, clerkClient } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

type Role = 'admin' | 'staff';

const QBK_ORG_ID = process.env.CLERK_ORG_ID;

// Map Clerk org roles to our app roles
// Clerk uses 'org:admin' and 'org:member' by default
const orgRoleToAppRole: Record<string, Role> = {
  'org:admin': 'admin',
  'org:member': 'staff',
};

export const requireRole = (...roles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!QBK_ORG_ID) {
      console.error('CLERK_ORG_ID not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      // Get user's staff organization assignments
      const orgList = await clerkClient.users.getOrganizationMembershipList({
        userId,
      });

      // Find if user is part of QBK Staff organization
      const qbkStaff = orgList.data.find(
        entry => entry.organization.id === QBK_ORG_ID
      );

      if (!qbkStaff) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const userRole = orgRoleToAppRole[qbkStaff.role];

      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (error) {
      console.error('Error fetching user from Clerk:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};
