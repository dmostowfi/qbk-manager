import { Request, Response, NextFunction } from 'express';
import eventsService from '../services/eventsService.js';
import { createError } from '../middleware/errorHandler.js';
import { EventFilters } from '../types/index.js';

export const eventsController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: EventFilters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        eventType: req.query.eventType as string,
        courtId: req.query.courtId ? parseInt(req.query.courtId as string) : undefined,
        level: req.query.level as string,
        gender: req.query.gender as string,
        isYouth: req.query.isYouth === 'true' ? true : req.query.isYouth === 'false' ? false : undefined,
        status: req.query.status as string,
      };

      const events = await eventsService.findAll(filters);
      res.json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.findById(req.params.id);
      if (!event) {
        throw createError('Event not found', 404);
      }
      res.json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.create(req.body);
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.update(req.params.id, req.body);
      res.json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await eventsService.delete(req.params.id);
      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};

export default eventsController;
