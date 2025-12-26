import { Request, Response, NextFunction } from 'express';
import enrollmentService from '../services/enrollmentService.js';
import { createError } from '../middleware/errorHandler.js';

export const enrollmentController = {
  async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: eventId } = req.params;
      const { playerId } = req.body;

      if (!playerId) {
        throw createError('playerId is required', 400);
      }

      const enrollment = await enrollmentService.enroll(eventId, playerId);
      res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Event not found' || error.message === 'Player not found') {
          return next(createError(error.message, 404));
        }
        if (error.message === 'Player is already enrolled in this event') {
          return next(createError(error.message, 409));
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
      const { id: eventId, enrollmentId } = req.params;

      await enrollmentService.unenroll(eventId, enrollmentId);
      res.json({ success: true, message: 'Enrollment removed successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Enrollment not found') {
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
