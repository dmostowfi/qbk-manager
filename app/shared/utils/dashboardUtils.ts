import { UserProfile, ActionItem, Message, Transaction } from '../types';

/**
 * Compute action items based on player profile state.
 * This runs client-side for the demo; will move to backend later.
 */
export function computeActionItems(profile: UserProfile): ActionItem[] {
  const items: ActionItem[] = [];

  // Only compute for players
  if (profile.role !== 'player') {
    return items;
  }

  const hasGoldMembership = profile.membershipType === 'GOLD';
  const isActive = profile.membershipStatus === 'ACTIVE';
  const classCredits = profile.classCredits ?? 0;
  const dropInCredits = profile.dropInCredits ?? 0;

  // Low class credits - suggest buying more or upgrading
  if (!hasGoldMembership && classCredits <= 2 && classCredits > 0) {
    items.push({
      id: 'low-class-credits',
      type: 'BUY_CREDITS',
      title: 'Running low on class credits',
      description: `You have ${classCredits} class credit${classCredits !== 1 ? 's' : ''} remaining. Purchase more to keep playing!`,
      priority: 'medium',
      action: {
        type: 'link',
        label: 'Buy Credits',
        href: '/membership',
      },
    });
  }

  // No class credits - more urgent
  if (!hasGoldMembership && classCredits === 0) {
    items.push({
      id: 'no-class-credits',
      type: 'BUY_CREDITS',
      title: 'No class credits',
      description: 'Purchase class credits or upgrade to Gold to enroll in upcoming classes.',
      priority: 'high',
      action: {
        type: 'link',
        label: 'Buy Credits',
        href: '/membership',
      },
    });
  }

  // Low drop-in credits for non-membership players
  if (profile.membershipType === 'NONE' && dropInCredits <= 2 && dropInCredits > 0) {
    items.push({
      id: 'low-dropin-credits',
      type: 'BUY_CREDITS',
      title: 'Running low on drop-in credits',
      description: `You have ${dropInCredits} drop-in credit${dropInCredits !== 1 ? 's' : ''} remaining.`,
      priority: 'medium',
      action: {
        type: 'link',
        label: 'Buy Credits',
        href: '/membership',
      },
    });
  }

  // Upgrade suggestion for frequent players without Gold
  if (!hasGoldMembership && (classCredits > 0 || dropInCredits > 0)) {
    items.push({
      id: 'upgrade-membership',
      type: 'UPGRADE_MEMBERSHIP',
      title: 'Upgrade to Gold',
      description: 'Get unlimited classes and open play with a Gold membership.',
      priority: 'low',
      action: {
        type: 'link',
        label: 'Learn More',
        href: '/membership',
      },
    });
  }

  // Paused membership
  if (profile.membershipStatus === 'PAUSED') {
    items.push({
      id: 'paused-membership',
      type: 'RENEW_MEMBERSHIP',
      title: 'Membership paused',
      description: 'Your membership is currently paused. Reactivate to resume unlimited access.',
      priority: 'high',
      action: {
        type: 'link',
        label: 'Reactivate',
        href: '/membership',
      },
    });
  }

  // Incomplete profile
  if (!profile.phone) {
    items.push({
      id: 'complete-profile',
      type: 'COMPLETE_PROFILE',
      title: 'Complete your profile',
      description: 'Add your phone number so we can send you important updates.',
      priority: 'low',
      action: {
        type: 'link',
        label: 'Update Profile',
        href: '/profile/edit',
      },
    });
  }

  return items;
}

/**
 * Get demo messages for the player dashboard.
 * In production, these would come from a backend API.
 */
export function getDemoMessages(): Message[] {
  const now = new Date();

  return [
    {
      id: 'welcome',
      type: 'info',
      title: 'Welcome to QBK!',
      body: 'Thanks for joining QBK Volleyball. Check out our upcoming classes and open play sessions.',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      id: 'holiday-hours',
      type: 'warning',
      title: 'Holiday Hours',
      body: 'We will have modified hours during the upcoming holiday weekend. Check the schedule for details.',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
  ];
}

/**
 * Get transactions for the player dashboard.
 * In production, these would come from a backend API.
 */
export function getDemoTransactions(): Transaction[] {
  // Return empty array for now - will be populated from backend later
  return [];
}
