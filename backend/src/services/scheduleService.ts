import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Schedule Service
 *
 * PURPOSE: Generate fair round-robin schedules for competitions.
 *
 * KEY CONCEPTS:
 *
 * 1. ROUND-ROBIN ALGORITHM
 *    - Each team plays every other team exactly once
 *    - For N teams: N-1 rounds, each round has N/2 matches
 *    - If odd number of teams, one team gets a "bye" each round
 *
 * 2. FAIR TIME SLOT ROTATION
 *    - Slots: 6pm (best), 7pm, 8pm, 9pm (worst)
 *    - Track "slot debt" per team (accumulated bad slot assignments)
 *    - Teams with highest debt get priority for good slots
 *
 * 3. EVENT CREATION
 *    - Each match creates an Event (appears on calendar)
 *    - Match links to Event for competition-specific data (scores, round)
 */

// Time slot definitions (hour of day)
const TIME_SLOTS = [18, 19, 20, 21]; // 6pm, 7pm, 8pm, 9pm

// Slot desirability weights (higher = more desirable)
// Used to calculate "slot debt" for fair rotation
const SLOT_WEIGHTS: Record<number, number> = {
  18: 4, // 6pm - most desirable
  19: 3, // 7pm
  20: 2, // 8pm
  21: 1, // 9pm - least desirable
};

// Average weight (2.5) - debt is calculated relative to this
const AVERAGE_SLOT_WEIGHT = 2.5;

interface ScheduleConfig {
  competitionId: string;
  startDate: Date;           // First game date
  dayOfWeek: number;         // 0=Sun, 1=Mon, ..., 6=Sat (for leagues)
  numberOfWeeks: number;     // How many weeks the league runs
  courtIds: number[];        // Available courts (e.g., [1, 2, 3])
}

interface Matchup {
  homeTeamId: string;
  awayTeamId: string;
}

interface ScheduledMatch extends Matchup {
  roundNumber: number;
  date: Date;
  startHour: number;
  courtId: number;
}

export const scheduleService = {
  /**
   * Generate a complete schedule for a competition
   *
   * STEPS:
   * 1. Validate competition is ready (REGISTRATION status, 2+ teams)
   * 2. Generate round-robin pairings for the number of weeks
   * 3. Assign time slots and courts fairly
   * 4. Create Event and Match records
   */
  async generateSchedule(config: ScheduleConfig) {
    const { competitionId, startDate, dayOfWeek, numberOfWeeks, courtIds } = config;

    // 1. Validate competition
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        teams: { select: { id: true, name: true } },
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'REGISTRATION') {
      throw new Error('Competition must be in REGISTRATION status to generate schedule');
    }

    if (competition.teams.length < 2) {
      throw new Error('Need at least 2 teams to generate schedule');
    }

    // Check all teams have valid rosters
    const requiredSize = competition.format === 'INTERMEDIATE_4S' ? 4 : 6;
    for (const team of competition.teams) {
      const rosterCount = await prisma.teamRoster.count({
        where: { teamId: team.id },
      });
      if (rosterCount < requiredSize) {
        throw new Error(`Team "${team.name}" needs ${requiredSize} players, has ${rosterCount}`);
      }
    }

    // 2. Generate round-robin pairings for the specified number of weeks
    // If weeks > teams-1, matchups will repeat (teams play each other multiple times)
    const teamIds = competition.teams.map((t) => t.id);
    const pairings = generateRoundRobinPairings(teamIds, numberOfWeeks);

    // 3. Calculate dates for each week
    const weekDates = calculateRoundDates(startDate, dayOfWeek, numberOfWeeks);

    // 4. Assign time slots and courts fairly
    const scheduledMatches = assignTimeSlotsAndCourts(pairings, weekDates, courtIds);

    // 5. Create Events and Matches in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdMatches = [];

      for (const match of scheduledMatches) {
        // Find team names for event title
        const homeTeam = competition.teams.find((t) => t.id === match.homeTeamId);
        const awayTeam = competition.teams.find((t) => t.id === match.awayTeamId);

        // Create Event (calendar entry)
        const event = await tx.event.create({
          data: {
            title: `${homeTeam!.name} vs ${awayTeam!.name}`,
            description: `${competition.name} - Round ${match.roundNumber}`,
            eventType: competition.type === 'LEAGUE' ? 'LEAGUE' : 'TOURNAMENT',
            courtId: match.courtId,
            startTime: new Date(match.date.setHours(match.startHour, 0, 0, 0)),
            endTime: new Date(match.date.setHours(match.startHour + 1, 0, 0, 0)),
            maxCapacity: 2, // Two teams
            currentEnrollment: 2, // Both teams "enrolled"
            level: 'INTERMEDIATE', // Default, could be derived from format
            gender: 'COED', // Default, could be added to competition model
            status: 'SCHEDULED',
          },
        });

        // Create Match (competition metadata)
        const createdMatch = await tx.match.create({
          data: {
            competitionId,
            eventId: event.id,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            roundNumber: match.roundNumber,
            isPlayoff: false,
          },
          include: {
            event: true,
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        });

        createdMatches.push(createdMatch);
      }

      return createdMatches;
    });

    return {
      competition: {
        id: competition.id,
        name: competition.name,
      },
      matchesCreated: result.length,
      weeks: numberOfWeeks,
      matches: result,
    };
  },

  /**
   * Record a match score
   *
   * WHO: Admin/Staff only
   */
  async recordScore(matchId: string, homeScore: number, awayScore: number) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { competition: { select: { status: true } } },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.competition.status !== 'ACTIVE') {
      throw new Error('Can only record scores for active competitions');
    }

    return prisma.match.update({
      where: { id: matchId },
      data: { homeScore, awayScore },
      include: {
        event: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    });
  },

  /**
   * Get schedule for a competition
   */
  async getSchedule(competitionId: string) {
    return prisma.match.findMany({
      where: { competitionId },
      include: {
        event: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: [
        { roundNumber: 'asc' },
        { event: { startTime: 'asc' } },
      ],
    });
  },
};

/**
 * Generate round-robin pairings using the "circle method"
 *
 * ALGORITHM:
 * - Fix one team in place, rotate others around it
 * - Each rotation produces one round of matchups
 * - Guarantees each team plays every other team exactly once
 *
 * EXAMPLE for 4 teams [A, B, C, D]:
 *   Round 1: A-D, B-C (A fixed, others rotate)
 *   Round 2: A-C, D-B
 *   Round 3: A-B, C-D
 *
 * For odd teams, add a "BYE" placeholder - team matched with BYE skips that round
 */
function generateRoundRobinPairings(teamIds: string[], numberOfRounds: number): Matchup[][] {
  const teams = [...teamIds];

  // If odd number of teams, add a "bye" placeholder
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const n = teams.length;
  const rounds: Matchup[][] = [];

  for (let round = 0; round < Math.min(numberOfRounds, n - 1); round++) {
    const matchups: Matchup[] = [];

    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];

      // Skip matches involving BYE
      if (home !== 'BYE' && away !== 'BYE') {
        // Alternate home/away to be fair
        if (round % 2 === 0) {
          matchups.push({ homeTeamId: home, awayTeamId: away });
        } else {
          matchups.push({ homeTeamId: away, awayTeamId: home });
        }
      }
    }

    rounds.push(matchups);

    // Rotate teams (keep first team fixed, rotate others)
    // [A, B, C, D] -> [A, D, B, C]
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }

  return rounds;
}

/**
 * Calculate dates for each round
 *
 * For leagues: Each round is one week apart, on the specified day
 * For tournaments: Could be same day (implement later if needed)
 */
function calculateRoundDates(startDate: Date, dayOfWeek: number, numberOfRounds: number): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  // Adjust to the correct day of week
  const currentDay = current.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  current.setDate(current.getDate() + daysUntilTarget);

  for (let i = 0; i < numberOfRounds; i++) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7); // Next week
  }

  return dates;
}

/**
 * Assign time slots and courts fairly
 *
 * COURT USAGE:
 * - Multiple matches can happen at the same time on different courts
 * - Example with 3 courts: 6pm has Court 1, Court 2, Court 3 available
 * - Fill courts at each time slot before moving to next time slot
 *
 * FAIR TIME SLOT ROTATION:
 * - Track "slot debt" per team (how many bad slots they've had)
 * - Teams with highest debt get priority for best time slots (6pm)
 * - Over the season, everyone gets roughly equal good/bad slots
 *
 * SLOT DEBT CALCULATION:
 * - Slots weighted: 6pm=4, 7pm=3, 8pm=2, 9pm=1
 * - Average weight is 2.5
 * - Getting 6pm (weight 4) decreases debt by 1.5
 * - Getting 9pm (weight 1) increases debt by 1.5
 */
function assignTimeSlotsAndCourts(
  pairings: Matchup[][],
  weekDates: Date[],
  courtIds: number[]
): ScheduledMatch[] {
  const scheduledMatches: ScheduledMatch[] = [];
  const slotDebt: Record<string, number> = {}; // teamId -> debt

  // Initialize debt to 0 for all teams
  pairings.flat().forEach((matchup) => {
    slotDebt[matchup.homeTeamId] = 0;
    slotDebt[matchup.awayTeamId] = 0;
  });

  // Number of matches that can happen at each time slot
  const matchesPerTimeSlot = courtIds.length;

  pairings.forEach((weekMatchups, weekIndex) => {
    const weekNumber = weekIndex + 1;
    const date = weekDates[weekIndex];

    // Sort matchups by combined slot debt (highest debt first = gets best time slot)
    const sortedMatchups = [...weekMatchups].sort((a, b) => {
      const debtA = slotDebt[a.homeTeamId] + slotDebt[a.awayTeamId];
      const debtB = slotDebt[b.homeTeamId] + slotDebt[b.awayTeamId];
      return debtB - debtA; // Higher debt gets priority for better slots
    });

    // Assign matches to time slots and courts
    // Fill all courts at 6pm first, then all courts at 7pm, etc.
    sortedMatchups.forEach((matchup, matchIndex) => {
      // Which time slot? (0, 1, 2, 3 = 6pm, 7pm, 8pm, 9pm)
      const timeSlotIndex = Math.floor(matchIndex / matchesPerTimeSlot);
      const timeSlot = TIME_SLOTS[timeSlotIndex % TIME_SLOTS.length];

      // Which court within this time slot?
      const courtIndex = matchIndex % matchesPerTimeSlot;
      const courtId = courtIds[courtIndex];

      scheduledMatches.push({
        ...matchup,
        roundNumber: weekNumber,
        date: new Date(date),
        startHour: timeSlot,
        courtId,
      });

      // Update slot debt for both teams
      const slotWeight = SLOT_WEIGHTS[timeSlot];
      const debtChange = AVERAGE_SLOT_WEIGHT - slotWeight;
      slotDebt[matchup.homeTeamId] += debtChange;
      slotDebt[matchup.awayTeamId] += debtChange;
    });
  });

  return scheduledMatches;
}

export default scheduleService;
