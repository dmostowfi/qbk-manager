import { PrismaClient, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { CompetitionFilters } from '../types/index.js';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export const competitionService = {
  /**
   * Find all competitions with optional filters
   *
   * WHY: Admin needs to see all competitions, possibly filtered by status
   * (e.g., show only REGISTRATION competitions for the public sign-up page)
   */
  async findAll(filters: CompetitionFilters = {}) {
    // Build the WHERE clause dynamically based on provided filters
    const where: Prisma.CompetitionWhereInput = {};

    if (filters.type) where.type = filters.type as any;
    if (filters.format) where.format = filters.format as any;
    if (filters.status) where.status = filters.status as any;

    return prisma.competition.findMany({
      where,
      // Include related data that's useful for list views
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            teams: true,      // How many teams registered
            freeAgents: true, // How many free agents
          },
        },
      },
      orderBy: { startDate: 'desc' }, // Most recent first
    });
  },

  /**
   * Find a single competition by ID with full details
   *
   * WHY: When viewing a specific competition, we need everything:
   * - Teams with their rosters (who's playing)
   * - Matches with scores (the schedule)
   * - Free agents (for admin to assign)
   */
  async findById(id: string) {
    return prisma.competition.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            captain: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            roster: {
              include: {
                player: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            _count: {
              select: { payments: true },
            },
          },
        },
        matches: {
          include: {
            event: true, // Get the Event for date/time/court
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
          orderBy: [
            { roundNumber: 'asc' },
            { event: { startTime: 'asc' } },
          ],
        },
        freeAgents: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Create a new competition
   *
   * WHY: Admin creates competitions with basic info first (DRAFT status),
   * then opens registration later. This allows setup before going live.
   *
   * VALIDATION: Prisma handles type validation via the schema.
   * Business validation (e.g., endDate > startDate) happens here.
   */
  async create(data: {
    name: string;
    type: 'LEAGUE' | 'TOURNAMENT';
    format: 'INTERMEDIATE_4S' | 'RECREATIONAL_6S';
    startDate: Date;
    endDate?: Date;
    pricePerTeam: number;
    maxTeams?: number;
    registrationDeadline?: Date;
  }) {
    // Business validation
    if (data.endDate && data.endDate < data.startDate) {
      throw new Error('End date must be after start date');
    }
    if (data.registrationDeadline && data.registrationDeadline > data.startDate) {
      throw new Error('Registration deadline must be before start date');
    }

    // Create Stripe product for this competition's team fees
    const stripeProduct = await stripe.products.create({
      name: `${data.name} - Team Fee`,
      description: `Team registration fee for ${data.name}`,
      metadata: {
        competitionType: data.type,
        competitionFormat: data.format,
      },
    });

    return prisma.competition.create({
      data: {
        name: data.name,
        type: data.type,
        format: data.format,
        startDate: data.startDate,
        endDate: data.endDate,
        pricePerTeam: data.pricePerTeam,
        maxTeams: data.maxTeams ?? 8,
        registrationDeadline: data.registrationDeadline,
        status: 'DRAFT', // Always start as DRAFT
        stripeProductId: stripeProduct.id,
      },
    });
  },

  /**
   * Update a competition
   *
   * WHY: Admin may need to adjust dates, price, or max teams.
   *
   * CONSTRAINT: Can only update if status is DRAFT or REGISTRATION.
   * Once ACTIVE, the competition is locked (games are scheduled).
   */
  async update(id: string, data: Prisma.CompetitionUpdateInput) {
    // First, check current status
    const competition = await prisma.competition.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status === 'ACTIVE' || competition.status === 'COMPLETED') {
      throw new Error('Cannot modify a competition that is active or completed');
    }

    return prisma.competition.update({
      where: { id },
      data,
    });
  },

  /**
   * Update competition status (state machine transitions)
   *
   * WHY: Competition lifecycle is: DRAFT → REGISTRATION → ACTIVE → COMPLETED
   * Each transition has rules:
   * - DRAFT → REGISTRATION: Opens sign-ups
   * - REGISTRATION → ACTIVE: Schedule must be generated first
   * - ACTIVE → COMPLETED: Season is over
   *
   * This method enforces valid transitions only.
   */
  async updateStatus(id: string, newStatus: 'DRAFT' | 'REGISTRATION' | 'ACTIVE' | 'COMPLETED') {
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        _count: { select: { teams: true, matches: true } },
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['REGISTRATION'],
      REGISTRATION: ['ACTIVE', 'DRAFT'], // Can go back to DRAFT if needed
      ACTIVE: ['COMPLETED'],
      COMPLETED: [], // Terminal state
    };

    if (!validTransitions[competition.status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${competition.status} to ${newStatus}`);
    }

    // Additional validation for specific transitions
    if (newStatus === 'ACTIVE') {
      if (competition._count.teams < 2) {
        throw new Error('Need at least 2 teams to start competition');
      }
      if (competition._count.matches === 0) {
        throw new Error('Schedule must be generated before activating competition');
      }
    }

    return prisma.competition.update({
      where: { id },
      data: { status: newStatus },
    });
  },

  /**
   * Delete a competition
   *
   * WHY: Admin may need to delete a competition that was created by mistake.
   *
   * CONSTRAINT: Can only delete if DRAFT (no teams registered yet).
   * This prevents accidental deletion of active competitions.
   */
  async delete(id: string) {
    const competition = await prisma.competition.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'DRAFT') {
      throw new Error('Can only delete competitions in DRAFT status');
    }

    return prisma.competition.delete({
      where: { id },
    });
  },

  /**
   * Get standings for a competition
   *
   * WHY: Players and admins want to see win/loss records.
   * Standings are calculated from Match scores, not stored separately.
   * This keeps data normalized (single source of truth).
   */
  async getStandings(id: string) {
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        teams: { select: { id: true, name: true } },
        matches: {
          where: {
            homeScore: { not: null }, // Only completed matches
            awayScore: { not: null },
          },
          select: {
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    // Calculate standings from match results
    // Note: Volleyball has no ties - every match has a winner
    const standings = competition.teams.map((team) => {
      const stats = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };

      competition.matches.forEach((match) => {
        if (match.homeTeamId === team.id) {
          stats.pointsFor += match.homeScore!;
          stats.pointsAgainst += match.awayScore!;
          if (match.homeScore! > match.awayScore!) stats.wins++;
          else if (match.homeScore! < match.awayScore!) stats.losses++;
          // Equal scores shouldn't happen in volleyball - ignore if data entry error
        } else if (match.awayTeamId === team.id) {
          stats.pointsFor += match.awayScore!;
          stats.pointsAgainst += match.homeScore!;
          if (match.awayScore! > match.homeScore!) stats.wins++;
          else if (match.awayScore! < match.homeScore!) stats.losses++;
        }
      });

      return {
        teamId: team.id,
        teamName: team.name,
        ...stats,
        gamesPlayed: stats.wins + stats.losses,
      };
    });

    // Sort by wins (descending), then point differential
    return standings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
    });
  },
};

export default competitionService;
