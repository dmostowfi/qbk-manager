import { Request, Response, NextFunction } from 'express';
import freeAgentService from '../services/freeAgentService.js';
import { createError } from '../middleware/errorHandler.js';

/**
 * Free Agent Controller
 *
 * PURPOSE: Handle HTTP requests for free agent management.
 *
 * AUTHORIZATION PATTERNS:
 * - Players can register themselves as free agents
 * - Players can withdraw their own free agent entry
 * - Admin/Staff can view all free agents
 * - Admin/Staff can assign free agents to teams
 */
export const freeAgentController = {
  /**
   * POST /api/competitions/:competitionId/free-agents
   * Register as a free agent for a competition
   *
   * WHO: Any authenticated player with completed profile
   * BODY: { notes?: string }
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.params;
      const { notes } = req.body;
      const authContext = req.authContext!;

      if (authContext.role !== 'player') {
        throw createError('Only players can register as free agents', 403);
      }

      const freeAgent = await freeAgentService.register(
        competitionId,
        authContext.playerId!,
        notes
      );

      res.status(201).json({ success: true, data: freeAgent });
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg === 'Competition not found' || msg === 'Player not found') {
          return next(createError(msg, 404));
        }
        if (
          msg.includes('not open') ||
          msg.includes('must complete') ||
          msg.includes('already on a team') ||
          msg.includes('already registered')
        ) {
          return next(createError(msg, 400));
        }
      }
      next(error);
    }
  },

  /**
   * GET /api/competitions/:competitionId/free-agents
   * List all free agents for a competition
   *
   * WHO: Admin/Staff (to see who needs teams)
   * QUERY: ?includeAssigned=true (optional, to see assigned ones too)
   */
  async getByCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.params;
      const includeAssigned = req.query.includeAssigned === 'true';

      const freeAgents = await freeAgentService.findByCompetition(
        competitionId,
        includeAssigned
      );

      res.json({ success: true, data: freeAgents });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/competitions/:competitionId/free-agents/:freeAgentId
   * Get a single free agent entry
   *
   * WHO: Admin/Staff or the player themselves
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { freeAgentId } = req.params;
      const authContext = req.authContext!;

      const freeAgent = await freeAgentService.findById(freeAgentId);

      if (!freeAgent) {
        throw createError('Free agent not found', 404);
      }

      // Authorization: Admin/Staff can view any, players can only view their own
      if (authContext.role === 'player' && freeAgent.player.id !== authContext.playerId) {
        throw createError('Not authorized to view this free agent entry', 403);
      }

      res.json({ success: true, data: freeAgent });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/competitions/:competitionId/free-agents/:freeAgentId/assign
   * Assign a free agent to a team
   *
   * WHO: Admin/Staff only
   * BODY: { teamId: string }
   */
  async assignToTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { freeAgentId } = req.params;
      const { teamId } = req.body;

      if (!teamId) {
        throw createError('teamId is required', 400);
      }

      const freeAgent = await freeAgentService.assignToTeam(freeAgentId, teamId);

      res.json({ success: true, data: freeAgent });
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg === 'Free agent not found' || msg === 'Team not found') {
          return next(createError(msg, 404));
        }
        if (
          msg.includes('already been assigned') ||
          msg.includes('not in the same competition') ||
          msg.includes('full') ||
          msg.includes('already on a team')
        ) {
          return next(createError(msg, 400));
        }
      }
      next(error);
    }
  },

  /**
   * DELETE /api/competitions/:competitionId/free-agents/:freeAgentId
   * Withdraw from the free agent list
   *
   * WHO: The player themselves (only if not yet assigned)
   */
  async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const { freeAgentId } = req.params;
      const authContext = req.authContext!;

      if (authContext.role !== 'player') {
        throw createError('Only players can withdraw their free agent entry', 403);
      }

      await freeAgentService.withdraw(freeAgentId, authContext.playerId!);

      res.json({ success: true, message: 'Successfully withdrawn from free agent list' });
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg === 'Free agent entry not found') {
          return next(createError(msg, 404));
        }
        if (msg === 'Not authorized to withdraw this free agent entry') {
          return next(createError(msg, 403));
        }
        if (msg.includes('Cannot withdraw')) {
          return next(createError(msg, 400));
        }
      }
      next(error);
    }
  },

  /**
   * GET /api/me/free-agent-entries
   * Get the current player's free agent entries across all competitions
   *
   * WHO: Authenticated player
   */
  async getMyEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const authContext = req.authContext!;

      if (authContext.role !== 'player') {
        // Staff/admin don't have free agent entries
        return res.json({ success: true, data: [] });
      }

      const entries = await freeAgentService.findByPlayer(authContext.playerId!);
      res.json({ success: true, data: entries });
    } catch (error) {
      next(error);
    }
  },
};

export default freeAgentController;
