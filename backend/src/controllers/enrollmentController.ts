import { Request, Response, NextFunction } from 'express';
import enrollmentService from '../services/enrollmentService.js';
import { createError } from '../middleware/errorHandler.js';

export const enrollmentController = {
  async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: eventId } = req.params;
      const authContext = req.authContext!;

      // Determine player IDs based on role
      let ids: string[];
      if (authContext.role === 'player') {
        // Players can only enroll themselves - use ID from auth, ignore request body
        ids = [authContext.playerId!];
      } else {
        // Staff/admin can enroll anyone - use IDs from request body
        const { playerId, playerIds } = req.body;
        ids = playerIds || (playerId ? [playerId] : []);
        if (ids.length === 0) {
          throw createError('playerId or playerIds is required', 400);
        }
      }

      const enrollments = await enrollmentService.enroll(eventId, ids);
      res.status(201).json({ success: true, data: enrollments });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return next(createError(error.message, 404));
        }
        if (error.message.includes('already enrolled')) {
          return next(createError(error.message, 409));
        }
        if (error.message.includes('insufficient') || error.message.includes('Insufficient')) {
          return next(createError(error.message, 400));
        }
        if (error.message === 'Event can no longer be modified') {
          return next(createError(error.message, 403));
        }
      }
      next(error);
    }
  },

  async unenroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: eventId } = req.params;
      const { enrollmentId, enrollmentIds } = req.body;

      // Normalize to array - accept single enrollmentId or array of enrollmentIds
      const ids = enrollmentIds || (enrollmentId ? [enrollmentId] : []);

      if (ids.length === 0) {
        throw createError('enrollmentId or enrollmentIds is required', 400);
      }

      await enrollmentService.unenroll(eventId, ids);
      res.json({ success: true, message: 'Enrollment(s) removed successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return next(createError(error.message, 404));
        }
        if (error.message === 'Enrollment does not belong to this event') {
          return next(createError(error.message, 400));
        }
        if (error.message === 'Event can no longer be modified') {
          return next(createError(error.message, 403));
        }
      }
      next(error);
    }
  },
};

export default enrollmentController;
