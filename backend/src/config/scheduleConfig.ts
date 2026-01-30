/**
 * Schedule Configuration
 *
 * Constants and utility functions for league schedule generation.
 */

// Time slot definitions (hour of day in 24h format)
export const TIME_SLOTS = [18, 19, 20, 21, 22]; // 6pm, 7pm, 8pm, 9pm, 10pm

// Slot desirability weights (higher = more desirable)
// 7pm is most preferred, 10pm least preferred
export const SLOT_WEIGHTS: Record<number, number> = {
  18: 3, // 6pm
  19: 5, // 7pm - most desirable
  20: 4, // 8pm
  21: 2, // 9pm
  22: 1, // 10pm - least desirable
};

// Average weight for debt calculation
export const AVERAGE_SLOT_WEIGHT =
  Object.values(SLOT_WEIGHTS).reduce((a, b) => a + b, 0) / Object.values(SLOT_WEIGHTS).length;

// Minimum teams required to generate a schedule
export const MIN_TEAMS = 4;

// Time slots sorted by preference (best first) for assignment priority
export const SLOTS_BY_PREFERENCE = [...TIME_SLOTS].sort(
  (a, b) => SLOT_WEIGHTS[b] - SLOT_WEIGHTS[a]
);

/**
 * US holidays that leagues should skip.
 * Returns holiday dates for a given year.
 */
export function getHolidaysForYear(year: number): Date[] {
  const holidays: Date[] = [];

  // New Year's Day - January 1
  holidays.push(new Date(year, 0, 1));

  // Memorial Day - Last Monday of May
  const may31 = new Date(year, 4, 31);
  const memorialDay = new Date(year, 4, 31 - ((may31.getDay() + 6) % 7));
  holidays.push(memorialDay);

  // Independence Day - July 4
  holidays.push(new Date(year, 6, 4));

  // Labor Day - First Monday of September
  const sep1 = new Date(year, 8, 1);
  const laborDay = new Date(year, 8, 1 + ((8 - sep1.getDay()) % 7));
  holidays.push(laborDay);

  // Thanksgiving - Fourth Thursday of November
  const nov1 = new Date(year, 10, 1);
  const firstThursday = new Date(year, 10, 1 + ((11 - nov1.getDay()) % 7));
  const thanksgiving = new Date(year, 10, firstThursday.getDate() + 21);
  holidays.push(thanksgiving);

  // Christmas Day - December 25
  holidays.push(new Date(year, 11, 25));

  return holidays;
}

/**
 * Check if a date falls on (or within the week of) a holiday.
 * Compares by calendar date only (ignores time).
 */
export function isHolidayWeek(date: Date): boolean {
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);

  for (const holiday of holidays) {
    // Check if the league date falls in the same week as the holiday
    // "Same week" = within 3 days before or after the holiday
    const diffMs = Math.abs(date.getTime() - holiday.getTime());
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    if (diffDays <= 3) {
      return true;
    }
  }

  return false;
}
