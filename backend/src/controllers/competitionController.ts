import { Request, Response, NextFunction } from 'express';
import competitionService from '../services/competitionService.js';
import { createError } from '../middleware/errorHandler.js';
import { CompetitionFilters } from '../types/index.js';

/**
 * Competition Controller
 *
 * PURPOSE: Handle HTTP requests for competition CRUD operations.
 * All methods follow the pattern:
 *   1. Parse request (params, query, body)
 *   2. Call service
 *   3. Return JSON response with appropriate status code
 *   4. Pass errors to error middleware via next(error)
 */
export const competitionController = {
  /**
   * GET /api/competitions
   * List all competitions with optional filters
   *
   * Query params: type, format, status
   * Example: GET /api/competitions?status=REGISTRATION
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract filters from query string
      const filters: CompetitionFilters = {
        type: req.query.type as string,
        format: req.query.format as string,
        status: req.query.status as string,
      };

      const competitions = await competitionService.findAll(filters);
      res.json({ success: true, data: competitions });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/competitions/:id
   * Get a single competition with full details (teams, matches, free agents)
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const competition = await competitionService.findById(req.params.id);

      if (!competition) {
        throw createError('Competition not found', 404);
      }

      res.json({ success: true, data: competition });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/competitions
   * Create a new competition (admin only)
   *
   * Body: { name, type, format, startDate, endDate?, pricePerTeam, maxTeams?, registrationDeadline? }
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, format, startDate, endDate, pricePerTeam, maxTeams, registrationDeadline } = req.body;

      // Validate required fields (controller validates presence, service validates business rules)
      if (!name || !type || !format || !startDate || pricePerTeam === undefined) {
        throw createError('Missing required fields: name, type, format, startDate, pricePerTeam', 400);
      }

      const competition = await competitionService.create({
        name,
        type,
        format,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        pricePerTeam: parseFloat(pricePerTeam),
        maxTeams: maxTeams ? parseInt(maxTeams) : undefined,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      });

      // 201 Created for successful resource creation
      res.status(201).json({ success: true, data: competition });
    } catch (error) {
      // Convert service errors to HTTP errors
      if (error instanceof Error) {
        if (error.message.includes('End date') || error.message.includes('Registration deadline')) {
          return next(createError(error.message, 400));
        }
      }
      next(error);
    }
  },

  /**
   * PUT /api/competitions/:id
   * Update a competition (admin only, only if DRAFT or REGISTRATION)
   *
   * Body: Partial competition fields to update
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      // Parse dates if provided
      const data = { ...req.body };
      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);
      if (data.registrationDeadline) data.registrationDeadline = new Date(data.registrationDeadline);
      if (data.pricePerTeam) data.pricePerTeam = parseFloat(data.pricePerTeam);
      if (data.maxTeams) data.maxTeams = parseInt(data.maxTeams);

      const competition = await competitionService.update(req.params.id, data);
      res.json({ success: true, data: competition });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Competition not found') {
          return next(createError(error.message, 404));
        }
        if (error.message.includes('Cannot modify')) {
          return next(createError(error.message, 403));
        }
      }
      next(error);
    }
  },

  /**
   * PUT /api/competitions/:id/status
   * Update competition status (admin only)
   *
   * Body: { status: 'DRAFT' | 'REGISTRATION' | 'ACTIVE' | 'COMPLETED' }
   *
   * WHY separate endpoint? Status changes have special validation rules
   * and represent a distinct action from updating other fields.
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;

      if (!status) {
        throw createError('Status is required', 400);
      }

      const validStatuses = ['DRAFT', 'REGISTRATION', 'ACTIVE', 'COMPLETED'];
      if (!validStatuses.includes(status)) {
        throw createError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }

      const competition = await competitionService.updateStatus(req.params.id, status);
      res.json({ success: true, data: competition });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Competition not found') {
          return next(createError(error.message, 404));
        }
        if (error.message.includes('Cannot transition') || error.message.includes('Need at least') || error.message.includes('Schedule must be')) {
          return next(createError(error.message, 400));
        }
      }
      next(error);
    }
  },

  /**
   * DELETE /api/competitions/:id
   * Delete a competition (admin only, only if DRAFT)
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await competitionService.delete(req.params.id);
      res.json({ success: true, message: 'Competition deleted successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Competition not found') {
          return next(createError(error.message, 404));
        }
        if (error.message.includes('Can only delete')) {
          return next(createError(error.message, 403));
        }
      }
      next(error);
    }
  },

  /**
   * GET /api/competitions/:id/standings
   * Get calculated standings for a competition
   */
  async getStandings(req: Request, res: Response, next: NextFunction) {
    try {
      const standings = await competitionService.getStandings(req.params.id);
      res.json({ success: true, data: standings });
    } catch (error) {
      if (error instanceof Error && error.message === 'Competition not found') {
        return next(createError(error.message, 404));
      }
      next(error);
    }
  },
};

export default competitionController;
