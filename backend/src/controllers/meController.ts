import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const meController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const authContext = req.authContext;
      if (!authContext) {
        throw createError('Unauthorized', 401);
      }

      const { role, userId } = authContext;

      if (role === 'admin' || role === 'staff') {
        const staff = await prisma.staff.findUnique({
          where: { clerkId: userId },
        });
        if (!staff) {
          throw createError('Staff not found', 404);
        }
        res.json({ success: true, data: { ...staff, role } });
      } else {
        const player = await prisma.player.findUnique({
          where: { clerkId: userId },
        });
        if (!player) {
          throw createError('Player not found', 404);
        }
        res.json({ success: true, data: { ...player, role } });
      }
    } catch (error) {
      next(error);
    }
  },

  async getEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const authContext = req.authContext;
      if (!authContext) {
        throw createError('Unauthorized', 401);
      }

      // Only players have enrollments
      if (authContext.role !== 'player') {
        res.json({ success: true, data: [] });
        return;
      }

      const player = await prisma.player.findUnique({
        where: { clerkId: authContext.userId },
      });
      if (!player) {
        throw createError('Player not found', 404);
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { playerId: player.id },
        include: { event: true },
        orderBy: { event: { startTime: 'asc' } },
      });

      res.json({ success: true, data: enrollments });
    } catch (error) {
      next(error);
    }
  },
};

export default meController;
