import { PrismaClient } from '@prisma/client';
import teamService from './teamService.js';

const prisma = new PrismaClient();

/**
 * Free Agent Service
 *
 * PURPOSE: Manage players looking for teams in competitions.
 *
 * FLOW:
 * 1. Player registers as free agent for a competition
 * 2. Admin views free agent list
 * 3. Admin assigns free agent to a team (adds to roster)
 * 4. Free agent status changes to ASSIGNED
 *
 * RULES:
 * - Player must have completed profile
 * - Player cannot be on a team in the same competition
 * - Player can only have one free agent entry per competition
 */
export const freeAgentService = {
  /**
   * Register a player as a free agent for a competition
   *
   * VALIDATES:
   * - Competition exists and is in REGISTRATION status
   * - Player has completed profile
   * - Player is not already on a team in this competition
   * - Player is not already a free agent in this competition
   */
  async register(competitionId: string, playerId: string, notes?: string) {
    // Check competition exists and is open for registration
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true, status: true },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'REGISTRATION') {
      throw new Error('Competition is not open for registration');
    }

    // Check player exists and has completed profile
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, firstName: true, lastName: true, profileCompletedAt: true },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.profileCompletedAt) {
      throw new Error('Player must complete profile before registering as free agent');
    }

    // Check player is not already on a team in this competition
    const existingTeamRoster = await prisma.teamRoster.findFirst({
      where: {
        playerId,
        team: { competitionId },
      },
    });

    if (existingTeamRoster) {
      throw new Error('Player is already on a team in this competition');
    }

    // Check player is not already a free agent
    const existingFreeAgent = await prisma.freeAgent.findUnique({
      where: {
        competitionId_playerId: { competitionId, playerId },
      },
    });

    if (existingFreeAgent) {
      throw new Error('Player is already registered as a free agent for this competition');
    }

    // Create free agent entry
    return prisma.freeAgent.create({
      data: {
        competitionId,
        playerId,
        notes,
        status: 'SEARCHING',
      },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        competition: {
          select: { id: true, name: true },
        },
      },
    });
  },

  /**
   * Get all free agents for a competition
   *
   * WHO: Admin/Staff (to see who needs teams)
   *
   * Returns players with SEARCHING status (not yet assigned)
   */
  async findByCompetition(competitionId: string, includeAssigned = false) {
    const where: any = { competitionId };

    if (!includeAssigned) {
      where.status = 'SEARCHING';
    }

    return prisma.freeAgent.findMany({
      where,
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' }, // First come, first served
    });
  },

  /**
   * Get a single free agent entry
   */
  async findById(freeAgentId: string) {
    return prisma.freeAgent.findUnique({
      where: { id: freeAgentId },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        competition: {
          select: { id: true, name: true },
        },
      },
    });
  },

  /**
   * Assign a free agent to a team
   *
   * WHO: Admin/Staff only
   *
   * STEPS:
   * 1. Validate free agent exists and is SEARCHING
   * 2. Add player to team roster (via teamService)
   * 3. Update free agent status to ASSIGNED
   */
  async assignToTeam(freeAgentId: string, teamId: string) {
    // Get free agent with competition info
    const freeAgent = await prisma.freeAgent.findUnique({
      where: { id: freeAgentId },
      include: {
        player: { select: { id: true, firstName: true, lastName: true } },
        competition: { select: { id: true } },
      },
    });

    if (!freeAgent) {
      throw new Error('Free agent not found');
    }

    if (freeAgent.status === 'ASSIGNED') {
      throw new Error('Free agent has already been assigned to a team');
    }

    // Verify team is in the same competition
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, competitionId: true },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    if (team.competitionId !== freeAgent.competition.id) {
      throw new Error('Team is not in the same competition as the free agent');
    }

    // Add player to team roster (teamService handles validation)
    await teamService.addToRoster(teamId, freeAgent.playerId);

    // Update free agent status
    return prisma.freeAgent.update({
      where: { id: freeAgentId },
      data: { status: 'ASSIGNED' },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  },

  /**
   * Player withdraws from free agent list
   *
   * WHO: The player themselves
   *
   * Only allowed if status is SEARCHING (not yet assigned)
   */
  async withdraw(freeAgentId: string, playerId: string) {
    const freeAgent = await prisma.freeAgent.findUnique({
      where: { id: freeAgentId },
    });

    if (!freeAgent) {
      throw new Error('Free agent entry not found');
    }

    // Verify the player owns this entry
    if (freeAgent.playerId !== playerId) {
      throw new Error('Not authorized to withdraw this free agent entry');
    }

    if (freeAgent.status === 'ASSIGNED') {
      throw new Error('Cannot withdraw after being assigned to a team');
    }

    // Delete the entry
    await prisma.freeAgent.delete({
      where: { id: freeAgentId },
    });

    return { success: true };
  },

  /**
   * Get a player's free agent entries across all competitions
   *
   * WHO: The player themselves (for "My Competitions" dashboard)
   */
  async findByPlayer(playerId: string) {
    return prisma.freeAgent.findMany({
      where: { playerId },
      include: {
        competition: {
          select: { id: true, name: true, status: true, startDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};

export default freeAgentService;
