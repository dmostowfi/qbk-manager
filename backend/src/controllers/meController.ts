import { Request, Response, NextFunction } from 'express';
import { getAuthUserId } from '../utils/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const meController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkId = getAuthUserId(req);
      if (!clerkId) {
        throw createError('Unauthorized', 401);
      }

      // Query both tables in parallel - no added latency
      const [staff, player] = await Promise.all([
        prisma.staff.findUnique({ where: { clerkId } }),
        prisma.player.findUnique({ where: { clerkId } }),
      ]);

      if (staff) {
        // Staff/Admin user
        return res.json({
          success: true,
          data: {
            id: staff.id,
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            role: staff.role.toLowerCase(), // ADMIN -> admin, STAFF -> staff
          },
        });
      }

      if (player) {
        // Player user
        return res.json({
          success: true,
          data: {
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            email: player.email,
            phone: player.phone,
            membershipType: player.membershipType,
            membershipStatus: player.membershipStatus,
            classCredits: player.classCredits,
            dropInCredits: player.dropInCredits,
            role: 'player',
          },
        });
      }

      throw createError('User not found', 404);
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
