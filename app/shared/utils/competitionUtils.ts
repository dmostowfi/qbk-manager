import { MembershipStatus } from '../types';

interface PlayerEligibility {
  membershipStatus?: MembershipStatus;
  profileCompletedAt?: string | null;
}

/**
 * Check if a player is eligible to join a team roster.
 * Returns an error message if ineligible, null if eligible.
 */
export function getRosterEligibilityError(player: PlayerEligibility): string | null {
  // Check profile completion first
  if (!player.profileCompletedAt) {
    return 'Incomplete profile';
  }

  // Check membership status - must be active to join competitions
  if (player.membershipStatus !== 'ACTIVE') {
    return 'Inactive membership';
  }

  return null;
}
