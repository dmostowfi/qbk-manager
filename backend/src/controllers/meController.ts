import { Request, Response, NextFunction } from 'express';
import { getAuthUserId, getAuthPlayer } from '../utils/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const meController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        throw createError('Unauthorized', 401);
      }

      const player = await getAuthPlayer(req);
      if (!player) {
        throw createError('Player not found', 404);
      }
      res.json({ success: true, data: player });
    } catch (error) {
      next(error);
    }
  },

  async getEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        throw createError('Unauthorized', 401);
      }

      const player = await getAuthPlayer(req);
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
