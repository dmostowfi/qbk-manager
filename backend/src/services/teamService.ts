import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Team Service
 *
 * PURPOSE: Handle team registration, roster management, and validation.
 *
 * KEY CONCEPTS:
 * - Captain: The player who creates and manages the team
 * - Roster: Players on the team (stored in TeamRoster join table)
 * - Team size is enforced by competition format (4s = 4 players, 6s = 6 players)
 */
export const teamService = {
  /**
   * Register a new team for a competition
   *
   * WHO CAN CALL: Any player with a completed profile
   * WHAT HAPPENS: Player becomes captain, gets added to roster automatically
   *
   * @param competitionId - Competition to join
   * @param captainId - Player ID of the person registering (becomes captain)
   * @param teamName - Name for the team
   */
  async register(competitionId: string, captainId: string, teamName: string) {
    // 1. Verify competition exists and is open for registration
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        _count: { select: { teams: true } },
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'REGISTRATION') {
      throw new Error('Competition is not open for registration');
    }

    if (competition._count.teams >= competition.maxTeams) {
      throw new Error('Competition is full');
    }

    // 2. Verify captain exists and has completed profile
    const captain = await prisma.player.findUnique({
      where: { id: captainId },
    });

    if (!captain) {
      throw new Error('Player not found');
    }

    if (!captain.profileCompletedAt) {
      throw new Error('You must complete your profile before registering a team');
    }

    // 3. Check captain isn't already on a team in this competition
    const existingRoster = await prisma.teamRoster.findFirst({
      where: {
        playerId: captainId,
        team: { competitionId },
      },
    });

    if (existingRoster) {
      throw new Error('You are already on a team in this competition');
    }

    // 4. Create team and add captain to roster (in a transaction)
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: teamName,
          competitionId,
          captainId,
          status: 'PENDING', // Will become CONFIRMED when paid
        },
      });

      // Auto-add captain to roster
      await tx.teamRoster.create({
        data: {
          teamId: team.id,
          playerId: captainId,
        },
      });

      // Return team with roster
      return tx.team.findUnique({
        where: { id: team.id },
        include: {
          captain: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          roster: {
            include: {
              player: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          competition: {
            select: { id: true, name: true, format: true, pricePerTeam: true },
          },
        },
      });
    });
  },

  /**
   * Get team by ID with full details
   */
  async findById(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captain: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        roster: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, email: true, profileCompletedAt: true },
            },
          },
        },
        competition: {
          select: { id: true, name: true, format: true, pricePerTeam: true, status: true },
        },
        payments: {
          select: { id: true, playerId: true, amount: true, status: true, paymentType: true },
        },
      },
    });
  },

  /**
   * Get all teams for a competition
   */
  async findByCompetition(competitionId: string) {
    return prisma.team.findMany({
      where: { competitionId },
      include: {
        captain: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        roster: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        _count: {
          select: { roster: true, payments: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Add a player to the team roster
   *
   * WHO CAN CALL: Captain only (enforced by controller)
   * VALIDATION:
   * - Player must exist and have completed profile
   * - Player can't already be on another team in this competition
   * - Team can't exceed max size for format
   */
  async addToRoster(teamId: string, playerId: string) {
    // Get team with competition format and current roster count
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: { select: { id: true, format: true, status: true } },
        _count: { select: { roster: true } },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Can only modify roster during REGISTRATION
    if (team.competition.status !== 'REGISTRATION') {
      throw new Error('Cannot modify roster after registration closes');
    }

    // Determine max roster size from format
    const maxRosterSize = team.competition.format === 'INTERMEDIATE_4S' ? 4 : 6;

    if (team._count.roster >= maxRosterSize) {
      throw new Error(`Team is full (max ${maxRosterSize} players for ${team.competition.format})`);
    }

    // Verify player exists and has completed profile
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.profileCompletedAt) {
      throw new Error('Player must complete their profile before joining a team');
    }

    // Check player isn't already on a team in this competition
    const existingRoster = await prisma.teamRoster.findFirst({
      where: {
        playerId,
        team: { competitionId: team.competition.id },
      },
    });

    if (existingRoster) {
      throw new Error('Player is already on a team in this competition');
    }

    // Add player to roster
    await prisma.teamRoster.create({
      data: { teamId, playerId },
    });

    // Return updated team
    return this.findById(teamId);
  },

  /**
   * Remove a player from the team roster
   *
   * WHO CAN CALL: Captain only (enforced by controller)
   * CONSTRAINT: Cannot remove the captain
   */
  async removeFromRoster(teamId: string, playerId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: { select: { status: true } },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Can only modify roster during REGISTRATION
    if (team.competition.status !== 'REGISTRATION') {
      throw new Error('Cannot modify roster after registration closes');
    }

    // Cannot remove captain
    if (playerId === team.captainId) {
      throw new Error('Cannot remove the captain from the roster');
    }

    // Find and delete the roster entry
    const rosterEntry = await prisma.teamRoster.findUnique({
      where: { teamId_playerId: { teamId, playerId } },
    });

    if (!rosterEntry) {
      throw new Error('Player is not on this team');
    }

    await prisma.teamRoster.delete({
      where: { id: rosterEntry.id },
    });

    return this.findById(teamId);
  },

  /**
   * Validate that a team's roster is complete and valid
   *
   * WHY: Before a team can be CONFIRMED (paid), the roster must be valid.
   * Called before payment and before schedule generation.
   *
   * RETURNS: { valid: boolean, errors: string[] }
   */
  async validateRoster(teamId: string): Promise<{ valid: boolean; errors: string[] }> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: { select: { format: true } },
        roster: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, profileCompletedAt: true },
            },
          },
        },
      },
    });

    if (!team) {
      return { valid: false, errors: ['Team not found'] };
    }

    const errors: string[] = [];
    const requiredSize = team.competition.format === 'INTERMEDIATE_4S' ? 4 : 6;

    // Check roster size
    if (team.roster.length < requiredSize) {
      errors.push(`Team needs ${requiredSize} players, currently has ${team.roster.length}`);
    }

    if (team.roster.length > requiredSize) {
      errors.push(`Team has too many players (${team.roster.length}), max is ${requiredSize}`);
    }

    // Check captain is on roster
    const captainOnRoster = team.roster.some((r) => r.playerId === team.captainId);
    if (!captainOnRoster) {
      errors.push('Captain must be on the roster');
    }

    // Check all players have completed profiles
    const incompleteProfiles = team.roster.filter((r) => !r.player.profileCompletedAt);
    if (incompleteProfiles.length > 0) {
      const names = incompleteProfiles.map((r) => `${r.player.firstName} ${r.player.lastName}`);
      errors.push(`Players with incomplete profiles: ${names.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Get teams for a specific player across all competitions
   *
   * WHY: Player dashboard shows "My Teams" - all competitions they're in
   */
  async findByPlayer(playerId: string) {
    const rosterEntries = await prisma.teamRoster.findMany({
      where: { playerId },
      include: {
        team: {
          include: {
            competition: {
              select: { id: true, name: true, type: true, format: true, status: true, startDate: true },
            },
            captain: {
              select: { id: true, firstName: true, lastName: true },
            },
            _count: {
              select: { roster: true },
            },
          },
        },
      },
      orderBy: { team: { competition: { startDate: 'desc' } } },
    });

    return rosterEntries.map((entry) => ({
      teamId: entry.team.id,
      teamName: entry.team.name,
      isCaptain: entry.team.captainId === playerId,
      teamStatus: entry.team.status,
      rosterCount: entry.team._count.roster,
      competition: entry.team.competition,
      captain: entry.team.captain,
    }));
  },
};

export default teamService;
