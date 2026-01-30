import { PrismaClient } from '@prisma/client';
import {
  TIME_SLOTS,
  SLOT_WEIGHTS,
  AVERAGE_SLOT_WEIGHT,
  MIN_TEAMS,
  SLOTS_BY_PREFERENCE,
  isHolidayWeek,
} from '../config/scheduleConfig.js';

const prisma = new PrismaClient();

/**
 * Schedule Service
 *
 * PURPOSE: Generate fair round-robin schedules for competitions.
 *
 * KEY CONCEPTS:
 *
 * 1. ROUND-ROBIN with DOUBLE HEADERS (no BYEs)
 *    - Each team plays every other team exactly once per cycle
 *    - Odd teams: bye team plays an EXHIBITION match instead of sitting out
 *    - Exhibition opponent rotates fairly (fewest prior double headers)
 *
 * 2. HOLIDAY-AWARE SCHEDULING
 *    - Weeks that fall on/near US holidays are skipped
 *    - Season extends until enough non-holiday weeks are found
 *
 * 3. COURT AVAILABILITY
 *    - Courts queried from Space table (not hardcoded)
 *    - Existing calendar events checked to avoid conflicts
 *    - Competition can specify courts or use all available
 *
 * 4. FAIR TIME SLOT ROTATION
 *    - Slots: 6pm, 7pm (best), 8pm, 9pm, 10pm (worst)
 *    - Track "slot debt" per team for fair rotation
 */

// ============== SHARED UTILITIES ==============
// These functions are used by both generateSchedule() and getMaxTeams()

/**
 * Calculate league dates, skipping holiday weeks.
 *
 * Instead of N consecutive weeks, collects weeks until N non-holiday
 * dates are found. Also returns any holidays that were skipped.
 */
export function calculateRoundDates(
  startDate: Date,
  dayOfWeek: number,
  numberOfWeeks: number
): { dates: Date[]; skippedHolidays: Date[] } {
  const dates: Date[] = [];
  const skippedHolidays: Date[] = [];
  const current = new Date(startDate);

  // Adjust to the correct day of week
  const currentDay = current.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  current.setDate(current.getDate() + daysUntilTarget);

  while (dates.length < numberOfWeeks) {
    if (isHolidayWeek(current)) {
      skippedHolidays.push(new Date(current));
    } else {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 7);
  }

  return { dates, skippedHolidays };
}

/**
 * Query which courts are free at which time slots for each league date.
 *
 * If assignedSpaceIds is provided, only those courts are considered.
 * Otherwise, all courts (Space with type COURT) are used.
 *
 * Returns a per-week availability map.
 */
export async function getCourtAvailability(
  weekDates: Date[],
  assignedSpaceIds?: string[]
): Promise<WeekAvailability[]> {
  // Get the courts to check
  let spaceIds: string[];
  if (assignedSpaceIds && assignedSpaceIds.length > 0) {
    spaceIds = assignedSpaceIds;
  } else {
    const courts = await prisma.space.findMany({
      where: { type: 'COURT' },
      select: { id: true },
    });
    spaceIds = courts.map((c) => c.id);
  }

  const availability: WeekAvailability[] = [];

  for (const date of weekDates) {
    // Query existing non-cancelled events on these courts for this date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingEvents = await prisma.event.findMany({
      where: {
        spaceId: { in: spaceIds },
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: 'CANCELLED' },
      },
      select: {
        spaceId: true,
        startTime: true,
      },
    });

    // Build set of occupied (spaceId, hour) pairs
    const occupied = new Set<string>();
    for (const event of existingEvents) {
      const hour = event.startTime.getHours();
      occupied.add(`${event.spaceId}:${hour}`);
    }

    // For each time slot, determine which courts are free
    const availableSlots = new Map<number, string[]>();
    for (const slot of TIME_SLOTS) {
      const freeCourts = spaceIds.filter((id) => !occupied.has(`${id}:${slot}`));
      if (freeCourts.length > 0) {
        availableSlots.set(slot, freeCourts);
      }
    }

    availability.push({ date, availableSlots });
  }

  return availability;
}

/**
 * Count total available court-slot combos per week, return the minimum (bottleneck).
 * Each combo can host one match.
 */
export function countAvailableSlots(availability: WeekAvailability[]): {
  minSlots: number;
  bottleneckWeek: Date | null;
} {
  let minSlots = Infinity;
  let bottleneckWeek: Date | null = null;

  for (const week of availability) {
    let weekSlots = 0;
    for (const courts of week.availableSlots.values()) {
      weekSlots += courts.length;
    }
    if (weekSlots < minSlots) {
      minSlots = weekSlots;
      bottleneckWeek = week.date;
    }
  }

  return { minSlots: minSlots === Infinity ? 0 : minSlots, bottleneckWeek };
}

/**
 * Calculate max teams a league can support based on court availability.
 *
 * With N teams (even): N/2 matches per week
 * With N teams (odd): (N-1)/2 regular + 1 exhibition = (N+1)/2 matches per week
 *
 * So maxTeams from M available slots:
 * - Even case: M slots -> M*2 teams
 * - Odd case: M slots -> M*2 - 1 teams (exhibition takes one extra slot)
 * We return M*2 (the even case, which is the maximum).
 */
export async function calculateMaxTeams(
  startDate: Date,
  numberOfWeeks: number,
  assignedSpaceIds?: string[]
): Promise<{ maxTeams: number; weekDates: string[]; skippedHolidays: string[] }> {
  const dayOfWeek = startDate.getDay();
  const { dates, skippedHolidays } = calculateRoundDates(startDate, dayOfWeek, numberOfWeeks);
  const availability = await getCourtAvailability(dates, assignedSpaceIds);
  const { minSlots } = countAvailableSlots(availability);

  return {
    maxTeams: minSlots * 2,
    weekDates: dates.map((d) => d.toISOString()),
    skippedHolidays: skippedHolidays.map((d) => d.toISOString()),
  };
}

// ============== TYPES ==============

interface WeekAvailability {
  date: Date;
  availableSlots: Map<number, string[]>; // timeSlot -> available spaceIds
}

interface Matchup {
  team1Id: string;
  team2Id: string;
  matchType: 'REGULAR' | 'EXHIBITION';
  exhibitionForTeamId?: string; // bye team ID for exhibition matches
}

interface ScheduledMatch extends Matchup {
  roundNumber: number;
  date: Date;
  startHour: number;
  spaceId: string;
}

// ============== MAIN SERVICE ==============

export const scheduleService = {
  /**
   * Generate a complete schedule for a competition.
   *
   * All config is derived from the competition record + calendar.
   * No body params needed from the client.
   */
  async generateSchedule(competitionId: string) {
    // 1. Load competition with teams and assigned spaces
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        teams: { select: { id: true, name: true, status: true, depositPaid: true } },
        spaces: { select: { id: true } },
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    if (competition.status !== 'REGISTRATION') {
      throw new Error('Competition must be in REGISTRATION status to generate schedule');
    }

    // Filter to deposit-paid teams only
    const eligibleTeams = competition.teams.filter((t) => t.depositPaid);

    if (eligibleTeams.length < MIN_TEAMS) {
      throw new Error(`Need at least ${MIN_TEAMS} deposit-paid teams to generate schedule (currently ${eligibleTeams.length})`);
    }

    // 2. Derive schedule parameters
    const numberOfWeeks = competition.numberOfWeeks;
    if (!numberOfWeeks) {
      throw new Error('Competition must have numberOfWeeks set');
    }

    const startDate = competition.startDate;
    const dayOfWeek = startDate.getDay();
    const assignedSpaceIds =
      competition.spaces.length > 0 ? competition.spaces.map((s) => s.id) : undefined;

    // 3. Calculate dates (skipping holidays)
    const { dates: weekDates } = calculateRoundDates(startDate, dayOfWeek, numberOfWeeks);

    // 4. Get court availability
    const availability = await getCourtAvailability(weekDates, assignedSpaceIds);

    // 5. Generate round-robin pairings (with exhibition for odd teams)
    const teamIds = eligibleTeams.map((t) => t.id);
    const pairings = generateRoundRobinPairings(teamIds, numberOfWeeks);

    // 6. Validate capacity: enough slots for all matches each week
    for (let i = 0; i < pairings.length; i++) {
      const totalMatches = pairings[i].length;
      let availableCount = 0;
      for (const courts of availability[i].availableSlots.values()) {
        availableCount += courts.length;
      }
      if (totalMatches > availableCount) {
        const weekDate = weekDates[i].toLocaleDateString();
        throw new Error(
          `Week of ${weekDate}: ${totalMatches} matches need ${totalMatches} court slots, but only ${availableCount} are available. Free up courts or reduce teams.`
        );
      }
    }

    // 7. Assign time slots and courts
    const scheduledMatches = assignTimeSlotsAndCourts(pairings, availability);

    // 8. Compute end date (last week's date)
    const computedEndDate = weekDates[weekDates.length - 1];

    // 9. Create Events and Matches in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update competition endDate
      await tx.competition.update({
        where: { id: competitionId },
        data: { endDate: computedEndDate },
      });

      const createdMatches = [];

      for (const match of scheduledMatches) {
        const team1 = eligibleTeams.find((t) => t.id === match.team1Id);
        const team2 = eligibleTeams.find((t) => t.id === match.team2Id);

        const matchDate = new Date(match.date);
        const startTime = new Date(matchDate.setHours(match.startHour, 0, 0, 0));
        const endTime = new Date(new Date(startTime).setHours(match.startHour + 1, 0, 0, 0));

        // Create Event (calendar entry)
        const event = await tx.event.create({
          data: {
            title: `${team1!.name} vs ${team2!.name}`,
            description: `${competition.name} - Week ${match.roundNumber}`,
            eventType: competition.type === 'LEAGUE' ? 'LEAGUE' : 'TOURNAMENT',
            spaceId: match.spaceId,
            startTime,
            endTime,
            maxCapacity: 2,
            currentEnrollment: 2,
            level: 'INTERMEDIATE',
            gender: 'COED',
            status: 'SCHEDULED',
          },
        });

        // Create Match
        const createdMatch = await tx.match.create({
          data: {
            competitionId,
            eventId: event.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            roundNumber: match.roundNumber,
            matchType: match.matchType,
            exhibitionForTeamId: match.exhibitionForTeamId ?? null,
          },
          include: {
            event: true,
            team1: { select: { id: true, name: true } },
            team2: { select: { id: true, name: true } },
          },
        });

        createdMatches.push(createdMatch);
      }

      return createdMatches;
    });

    return {
      competition: { id: competition.id, name: competition.name },
      matchesCreated: result.length,
      weeks: numberOfWeeks,
      matches: result,
    };
  },

  /**
   * Record a match score (Admin/Staff only)
   */
  async recordScore(matchId: string, team1Score: number, team2Score: number) {
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
      data: { team1Score, team2Score },
      include: {
        event: true,
        team1: { select: { id: true, name: true } },
        team2: { select: { id: true, name: true } },
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
        event: {
          include: {
            space: { select: { id: true, name: true } },
          },
        },
        team1: { select: { id: true, name: true } },
        team2: { select: { id: true, name: true } },
      },
      orderBy: [{ roundNumber: 'asc' }, { event: { startTime: 'asc' } }],
    });
  },
};

// ============== ALGORITHM FUNCTIONS ==============

/**
 * Generate round-robin pairings using the "circle method".
 *
 * For odd teams: the team that would have a BYE instead plays
 * an EXHIBITION match against the team with fewest prior double headers.
 */
function generateRoundRobinPairings(teamIds: string[], numberOfWeeks: number): Matchup[][] {
  const teams = [...teamIds];
  const isOdd = teams.length % 2 !== 0;

  // For odd teams, add BYE placeholder (will be replaced with exhibition)
  if (isOdd) {
    teams.push('BYE');
  }

  const n = teams.length;
  const roundsPerCycle = n - 1;
  const rounds: Matchup[][] = [];

  for (let week = 0; week < numberOfWeeks; week++) {
    const roundInCycle = week % roundsPerCycle;
    const rotatedTeams = getRotatedTeams(teams, roundInCycle);
    const matchups: Matchup[] = [];
    let byeTeamId: string | null = null;

    for (let i = 0; i < rotatedTeams.length / 2; i++) {
      const teamA = rotatedTeams[i];
      const teamB = rotatedTeams[rotatedTeams.length - 1 - i];

      if (teamA === 'BYE') {
        byeTeamId = teamB;
      } else if (teamB === 'BYE') {
        byeTeamId = teamA;
      } else {
        matchups.push({
          team1Id: teamA,
          team2Id: teamB,
          matchType: 'REGULAR',
        });
      }
    }

    // Handle exhibition match for bye team
    if (byeTeamId && isOdd) {
      // Pick the opponent with the fewest prior exhibition double-headers,
      // derived directly from the matchups already generated.
      const regularTeamsThisWeek = matchups.flatMap((m) => [m.team1Id, m.team2Id]);

      const priorExhibitionOpponents = rounds.flat()
        .filter((m) => m.matchType === 'EXHIBITION')
        .map((m) => m.team2Id);

      const candidates = [...regularTeamsThisWeek].sort((a, b) => {
        const countA = priorExhibitionOpponents.filter((id) => id === a).length;
        const countB = priorExhibitionOpponents.filter((id) => id === b).length;
        return countA - countB;
      });

      const exhibitionOpponent = candidates[0];

      if (exhibitionOpponent) {
        matchups.push({
          team1Id: byeTeamId,
          team2Id: exhibitionOpponent,
          matchType: 'EXHIBITION',
          exhibitionForTeamId: byeTeamId,
        });
      }
    }

    rounds.push(matchups);
  }

  return rounds;
}

/**
 * Get team array after N rotations (circle method).
 * First team stays fixed, others rotate.
 */
function getRotatedTeams(teams: string[], rotations: number): string[] {
  const arr = [...teams];

  for (let r = 0; r < rotations; r++) {
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  }

  return arr;
}

/**
 * Assign time slots and courts based on variable availability.
 *
 * Regular matches assigned first (by slot debt priority).
 * Exhibition matches placed adjacent to the opponent's regular match when possible.
 */
function assignTimeSlotsAndCourts(
  pairings: Matchup[][],
  availability: WeekAvailability[]
): ScheduledMatch[] {
  const scheduledMatches: ScheduledMatch[] = [];
  const slotDebt: Record<string, number> = {};

  // Initialize debt
  pairings.flat().forEach((m) => {
    slotDebt[m.team1Id] = slotDebt[m.team1Id] ?? 0;
    slotDebt[m.team2Id] = slotDebt[m.team2Id] ?? 0;
  });

  pairings.forEach((weekMatchups, weekIndex) => {
    const weekNumber = weekIndex + 1;
    const weekAvail = availability[weekIndex];

    // Separate regular and exhibition matches
    const regularMatches = weekMatchups.filter((m) => m.matchType === 'REGULAR');
    const exhibitionMatches = weekMatchups.filter((m) => m.matchType === 'EXHIBITION');

    // Build ordered available slots for this week (best preference first)
    const orderedSlots = buildOrderedSlots(weekAvail);

    // Track which slots are consumed this week
    const consumed = new Set<string>(); // "spaceId:hour"

    // Sort regular matches by max slot debt (higher debt gets better slots)
    const sortedRegular = [...regularMatches].sort((a, b) => {
      const maxDebtA = Math.max(slotDebt[a.team1Id], slotDebt[a.team2Id]);
      const maxDebtB = Math.max(slotDebt[b.team1Id], slotDebt[b.team2Id]);
      return maxDebtB - maxDebtA;
    });

    // Assign regular matches
    const regularAssignments = new Map<string, { spaceId: string; hour: number }>();

    for (const match of sortedRegular) {
      const slot = findAvailableSlot(orderedSlots, consumed);
      if (!slot) {
        throw new Error(`No available slot for regular match in week ${weekNumber}`);
      }
      consumed.add(`${slot.spaceId}:${slot.hour}`);
      regularAssignments.set(`${match.team1Id}:${match.team2Id}`, slot);

      scheduledMatches.push({
        ...match,
        roundNumber: weekNumber,
        date: new Date(weekAvail.date),
        startHour: slot.hour,
        spaceId: slot.spaceId,
      });

      // Update slot debt
      const debtChange = AVERAGE_SLOT_WEIGHT - SLOT_WEIGHTS[slot.hour];
      slotDebt[match.team1Id] += debtChange;
      slotDebt[match.team2Id] += debtChange;
    }

    // Assign exhibition matches (try to place adjacent to opponent's regular match)
    for (const match of exhibitionMatches) {
      const opponentId =
        match.exhibitionForTeamId === match.team1Id ? match.team2Id : match.team1Id;

      // Find opponent's regular match assignment
      let preferredSlot: { spaceId: string; hour: number } | null = null;
      for (const [key, assignment] of regularAssignments) {
        if (key.includes(opponentId)) {
          // Try same court, next time slot
          const nextHour = assignment.hour + 1;
          if (
            TIME_SLOTS.includes(nextHour) &&
            !consumed.has(`${assignment.spaceId}:${nextHour}`)
          ) {
            // Check it's actually available in the original availability
            const freeCourts = weekAvail.availableSlots.get(nextHour);
            if (freeCourts && freeCourts.includes(assignment.spaceId)) {
              preferredSlot = { spaceId: assignment.spaceId, hour: nextHour };
            }
          }
          break;
        }
      }

      const slot = preferredSlot || findAvailableSlot(orderedSlots, consumed);
      if (!slot) {
        throw new Error(`No available slot for exhibition match in week ${weekNumber}`);
      }
      consumed.add(`${slot.spaceId}:${slot.hour}`);

      scheduledMatches.push({
        ...match,
        roundNumber: weekNumber,
        date: new Date(weekAvail.date),
        startHour: slot.hour,
        spaceId: slot.spaceId,
      });

      // Update slot debt (exhibition still affects fairness)
      const debtChange = AVERAGE_SLOT_WEIGHT - SLOT_WEIGHTS[slot.hour];
      slotDebt[match.team1Id] += debtChange;
      slotDebt[match.team2Id] += debtChange;
    }
  });

  return scheduledMatches;
}

/**
 * Build an ordered list of available slots for a week, sorted by preference.
 */
function buildOrderedSlots(
  weekAvail: WeekAvailability
): { spaceId: string; hour: number }[] {
  const slots: { spaceId: string; hour: number }[] = [];

  for (const hour of SLOTS_BY_PREFERENCE) {
    const freeCourts = weekAvail.availableSlots.get(hour);
    if (freeCourts) {
      for (const spaceId of freeCourts) {
        slots.push({ spaceId, hour });
      }
    }
  }

  return slots;
}

/**
 * Find the first available slot that hasn't been consumed this week.
 */
function findAvailableSlot(
  orderedSlots: { spaceId: string; hour: number }[],
  consumed: Set<string>
): { spaceId: string; hour: number } | null {
  for (const slot of orderedSlots) {
    if (!consumed.has(`${slot.spaceId}:${slot.hour}`)) {
      return slot;
    }
  }
  return null;
}

export default scheduleService;
