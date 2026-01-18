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
            streetAddress: player.streetAddress,
            city: player.city,
            state: player.state,
            zipCode: player.zipCode,
            dateOfBirth: player.dateOfBirth,
            tosAcceptedAt: player.tosAcceptedAt,
            privacyAcceptedAt: player.privacyAcceptedAt,
            waiverSignedAt: player.waiverSignedAt,
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

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const authContext = req.authContext;
      if (!authContext) {
        throw createError('Unauthorized', 401);
      }

      // Only players have transactions
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

      const transactions = await prisma.transaction.findMany({
        where: {
          playerId: player.id,
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const authContext = req.authContext;
      if (!authContext) {
        throw createError('Unauthorized', 401);
      }

      if (authContext.role !== 'player') {
        throw createError('Only players can update their profile', 403);
      }

      const player = await prisma.player.findUnique({
        where: { clerkId: authContext.userId },
      });
      if (!player) {
        throw createError('Player not found', 404);
      }

      // Only allow updating contact info fields (not membership/credits)
      const { phone, streetAddress, city, state, zipCode, dateOfBirth } = req.body;

      const updatedPlayer = await prisma.player.update({
        where: { id: player.id },
        data: {
          phone: phone !== undefined ? phone : player.phone,
          streetAddress: streetAddress !== undefined ? streetAddress : player.streetAddress,
          city: city !== undefined ? city : player.city,
          state: state !== undefined ? state : player.state,
          zipCode: zipCode !== undefined ? zipCode : player.zipCode,
          dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : player.dateOfBirth,
        },
      });

      res.json({
        success: true,
        data: {
          id: updatedPlayer.id,
          firstName: updatedPlayer.firstName,
          lastName: updatedPlayer.lastName,
          email: updatedPlayer.email,
          phone: updatedPlayer.phone,
          streetAddress: updatedPlayer.streetAddress,
          city: updatedPlayer.city,
          state: updatedPlayer.state,
          zipCode: updatedPlayer.zipCode,
          dateOfBirth: updatedPlayer.dateOfBirth,
          tosAcceptedAt: updatedPlayer.tosAcceptedAt,
          privacyAcceptedAt: updatedPlayer.privacyAcceptedAt,
          waiverSignedAt: updatedPlayer.waiverSignedAt,
          membershipType: updatedPlayer.membershipType,
          membershipStatus: updatedPlayer.membershipStatus,
          classCredits: updatedPlayer.classCredits,
          dropInCredits: updatedPlayer.dropInCredits,
          role: 'player',
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async signAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const authContext = req.authContext;
      if (!authContext) {
        throw createError('Unauthorized', 401);
      }

      if (authContext.role !== 'player') {
        throw createError('Only players can sign agreements', 403);
      }

      const { agreementType } = req.body;
      const validTypes = ['tos', 'privacy', 'waiver'];

      if (!agreementType || !validTypes.includes(agreementType)) {
        throw createError('Invalid agreement type. Must be: tos, privacy, or waiver', 400);
      }

      const player = await prisma.player.findUnique({
        where: { clerkId: authContext.userId },
      });
      if (!player) {
        throw createError('Player not found', 404);
      }

      // Map agreement type to field name
      const fieldMap: Record<string, string> = {
        tos: 'tosAcceptedAt',
        privacy: 'privacyAcceptedAt',
        waiver: 'waiverSignedAt',
      };

      const fieldName = fieldMap[agreementType];
      const now = new Date();

      // Update the appropriate field
      const updatedPlayer = await prisma.player.update({
        where: { id: player.id },
        data: { [fieldName]: now },
      });

      res.json({
        success: true,
        data: {
          agreementType,
          signedAt: now,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default meController;
