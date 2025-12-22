import { Request, Response, NextFunction } from 'express';
import playersService from '../services/playersService.js';
import { createError } from '../middleware/errorHandler.js';
import { PlayerFilters } from '../types/index.js';

export const playersController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: PlayerFilters = {
        membershipType: req.query.membershipType as string,
        membershipStatus: req.query.membershipStatus as string,
        search: req.query.search as string,
      };

      const players = await playersService.findAll(filters);
      res.json({ success: true, data: players });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const player = await playersService.findById(req.params.id);
      if (!player) {
        throw createError('Player not found', 404);
      }
      res.json({ success: true, data: player });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const player = await playersService.create(req.body);
      res.status(201).json({ success: true, data: player });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const player = await playersService.update(req.params.id, req.body);
      res.json({ success: true, data: player });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await playersService.delete(req.params.id);
      res.json({ success: true, message: 'Player deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};

export default playersController;
