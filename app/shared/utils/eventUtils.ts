import { EventType, MembershipType, MembershipStatus } from '../types';

/**
 * Check if an event can still be modified.
 * Events become read-only 15 minutes after their start time.
 */
export function isEventEditable(startTime: string | Date): boolean {
  const eventStart = new Date(startTime);
  const cutoff = new Date(eventStart.getTime() + 15 * 60 * 1000); // 15 minutes after start
  return new Date() < cutoff;
}

interface PlayerEligibility {
  membershipType?: MembershipType;
  membershipStatus?: MembershipStatus;
  classCredits?: number;
  dropInCredits?: number;
}

/**
 * Check if a player is eligible to enroll in an event.
 * Returns an error message if ineligible, null if eligible.
 */
export function getEnrollmentEligibilityError(
  player: PlayerEligibility,
  eventType: EventType
): string | null {
  const isActive = player.membershipStatus === 'ACTIVE';

  // GOLD + ACTIVE: unlimited everything
  if (player.membershipType === 'GOLD' && isActive) {
    return null;
  }

  // DROP_IN: unlimited open play if active, needs credits for classes
  if (player.membershipType === 'DROP_IN') {
    if (eventType === 'CLASS') {
      return (player.classCredits || 0) > 0 ? null : 'No class credits';
    }
    if (isActive) {
      return null;
    }
    // Paused/cancelled DROP_IN for OPEN_PLAY needs credits
    return (player.dropInCredits || 0) > 0 ? null : 'No drop-in credits';
  }

  // Credit-based: NONE, or paused/cancelled memberships
  if (eventType === 'CLASS') {
    return (player.classCredits || 0) > 0 ? null : 'No class credits';
  }
  if (eventType === 'OPEN_PLAY') {
    return (player.dropInCredits || 0) > 0 ? null : 'No drop-in credits';
  }

  return null; // Other event types don't require credits
}
