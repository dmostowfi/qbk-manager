import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireRole = (...roles: ('ADMIN' | 'STAFF')[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
