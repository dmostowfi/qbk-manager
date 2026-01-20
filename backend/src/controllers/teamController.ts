import { Request, Response, NextFunction } from 'express';
import teamService from '../services/teamService.js';
import { createError } from '../middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Team Controller
 *
 * PURPOSE: Handle HTTP requests for team registration and roster management.
 *
 * AUTHORIZATION PATTERNS:
 * - Anyone can view teams (public)
 * - Players can register teams (becomes captain)
 * - Captains can modify their own team's roster
 * - Admin/Staff can modify any team
 */
export const teamController = {
  /**
   * POST /api/competitions/:competitionId/teams
   * Register a new team
   *
   * WHO: Any authenticated player with completed profile
   * BODY: { name: string }
   *
   * The authenticated player becomes the captain.
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.params;
      const { name } = req.body;
      const authContext = req.authContext!;

      if (!name) {
        throw createError('Team name is required', 400);
      }

      // Players register themselves as captain
      // Admin/Staff can register on behalf of a player (playerId in body)
      let captainId: string;

      if (authContext.role === 'player') {
        captainId = authContext.playerId!;
      } else {
        // Admin/Staff must specify which player is captain
        if (!req.body.captainId) {
          throw createError('captainId is required when admin/staff registers a team', 400);
        }
        captainId = req.body.captainId;
      }

      const team = await teamService.register(competitionId, captainId, name);
      res.status(201).json({ success: true, data: team });
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg === 'Competition not found' || msg === 'Player not found') {
          return next(createError(msg, 404));
        }
        if (msg.includes('not open') || msg.includes('is full') || msg.includes('must complete') || msg.includes('already on a team')) {
          return next(createError(msg, 400));
        }
      }
      next(error);
    }
  },

  /**
   * GET /api/competitions/:competitionId/teams
   * List all teams in a competition
   *
   * WHO: Public
   */
  async getByCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.params;
      const teams = await teamService.findByCompetition(competitionId);
      res.json({ success: true, data: teams });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/competitions/:competitionId/teams/:teamId
   * Get a single team with full details
   *
   * WHO: Public
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      const team = await teamService.findById(teamId);

      if (!team) {
        throw createError('Team not found', 404);
      }

      res.json({ success: true, data: team });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/competitions/:competitionId/teams/:teamId/roster
   * Add a player to the team roster
   *
   * WHO: Captain of the team OR Admin/Staff
   * BODY: { playerId: string }
   */
  async addToRoster(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      const { playerId } = req.body;
      const authContext = req.authContext!;

      if (!playerId) {
        throw createError('playerId is required', 400);
      }

      // Authorization: Check if user is captain or admin/staff
      await assertCanModifyTeam(teamId, authContext);

      const team = await teamService.addToRoster(teamId, playerId);
      res.json({ success: true, data: team });
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg === 'Team not found' || msg === 'Player not found') {
          return next(createError(msg, 404));
        }
        if (msg === 'Not authorized to modify this team') {
          return next(createError(msg, 403));
        }
        if (msg.includes('full') || msg.includes('already on a team') || msg.includes('must complete') || msg.includes('Cannot modify')) {
          return next(createError(msg, 400));
        }
      }
      next(error);
    }
  },

  /**
   * DELETE /api/competitions/:competitionId/teams/:teamId/roster/:playerId
   * Remove a player from the team roster
   *
   * WHO: Captain of the team OR Admin/Staff
   */
  async removeFromRoster(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId, playerId } = req.params;
      const authContext = req.authContext!;

      // Authorization: Check if user is captain or admin/staff
      await assertCanModifyTeam(teamId, authContext);

      const team = await teamService.removeFromRoster(teamId, playerId);
      res.json({ success: true, data: team });
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg === 'Team not found' || msg === 'Player is not on this team') {
          return next(createError(msg, 404));
        }
        if (msg === 'Not authorized to modify this team') {
          return next(createError(msg, 403));
        }
        if (msg.includes('Cannot remove the captain') || msg.includes('Cannot modify')) {
          return next(createError(msg, 400));
        }
      }
      next(error);
    }
  },

  /**
   * GET /api/competitions/:competitionId/teams/:teamId/validate
   * Check if a team's roster is valid
   *
   * WHO: Captain of the team OR Admin/Staff
   *
   * WHY: Captain wants to know if they're ready to pay/lock in roster
   */
  async validateRoster(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      const result = await teamService.validateRoster(teamId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/me/teams
   * Get all teams the current player is on
   *
   * WHO: Authenticated player
   */
  async getMyTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const authContext = req.authContext!;

      if (authContext.role !== 'player') {
        // Staff/admin don't have teams
        return res.json({ success: true, data: [] });
      }

      const teams = await teamService.findByPlayer(authContext.playerId!);
      res.json({ success: true, data: teams });
    } catch (error) {
      next(error);
    }
  },
};

/**
 * Helper: Check if the current user can modify a team
 *
 * RULES:
 * - Admin/Staff can modify any team
 * - Players can only modify teams they captain
 */
async function assertCanModifyTeam(
  teamId: string,
  authContext: { role: string; playerId?: string }
): Promise<void> {
  // Admin/Staff can modify any team
  if (authContext.role === 'admin' || authContext.role === 'staff') {
    return;
  }

  // Players must be the captain
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captainId: true },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  if (team.captainId !== authContext.playerId) {
    throw new Error('Not authorized to modify this team');
  }
}

export default teamController;
