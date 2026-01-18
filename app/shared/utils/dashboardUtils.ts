import { UserProfile, ActionItem, Message } from '../types';

// Keys for localStorage dismiss tracking
const DISMISS_KEYS = {
  startPlaying: 'action_dismissed_start_playing',
  lowClassCredits: 'action_dismissed_low_class_credits',
  lowDropinCredits: 'action_dismissed_low_dropin_credits',
};

// 60 days in milliseconds
const UPSELL_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Check if a profile is complete (all required fields filled)
 */
function isProfileComplete(profile: UserProfile): boolean {
  return !!(
    profile.phone &&
    profile.streetAddress &&
    profile.city &&
    profile.state &&
    profile.zipCode &&
    profile.dateOfBirth &&
    profile.tosAcceptedAt &&
    profile.privacyAcceptedAt &&
    profile.waiverSignedAt
  );
}

/**
 * Check if an item was dismissed and is still in cooldown
 */
function isDismissedRecently(key: string, cooldownMs: number = 0): boolean {
  try {
    const dismissedAt = localStorage.getItem(key);
    if (!dismissedAt) return false;

    const dismissedTime = parseInt(dismissedAt, 10);
    if (isNaN(dismissedTime)) return false;

    // If no cooldown, check if ever dismissed
    if (cooldownMs === 0) return true;

    // Check if cooldown has passed
    return Date.now() - dismissedTime < cooldownMs;
  } catch {
    // localStorage not available (SSR or error)
    return false;
  }
}

/**
 * Dismiss an action item
 */
export function dismissActionItem(itemId: string): void {
  const keyMap: Record<string, string> = {
    'start-playing': DISMISS_KEYS.startPlaying,
    'low-class-credits': DISMISS_KEYS.lowClassCredits,
    'low-dropin-credits': DISMISS_KEYS.lowDropinCredits,
  };

  const key = keyMap[itemId];
  if (key) {
    try {
      localStorage.setItem(key, Date.now().toString());
    } catch {
      // localStorage not available
    }
  }
}

/**
 * Clear dismiss state for an item (e.g., when condition resets)
 */
export function clearDismiss(itemId: string): void {
  const keyMap: Record<string, string> = {
    'start-playing': DISMISS_KEYS.startPlaying,
    'low-class-credits': DISMISS_KEYS.lowClassCredits,
    'low-dropin-credits': DISMISS_KEYS.lowDropinCredits,
  };

  const key = keyMap[itemId];
  if (key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage not available
    }
  }
}

/**
 * Compute action items based on player profile state.
 * Returns up to 3 action items:
 * 1. Complete Profile (not dismissible, blocks enrollment)
 * 2. Start Playing (dismissible, for new players with no credits/membership)
 * 3. Low Credits Upsell (dismissible, 60-day cooldown)
 */
export function computeActionItems(profile: UserProfile): ActionItem[] {
  const items: ActionItem[] = [];

  // Only compute for players
  if (profile.role !== 'player') {
    return items;
  }

  const classCredits = profile.classCredits ?? 0;
  const dropInCredits = profile.dropInCredits ?? 0;
  const hasNoMembership = profile.membershipType === 'NONE';
  const hasNoCredits = classCredits === 0 && dropInCredits === 0;

  // 1. Complete Profile (Priority: High, NOT dismissible)
  if (!isProfileComplete(profile)) {
    items.push({
      id: 'complete-profile',
      type: 'COMPLETE_PROFILE',
      title: 'Finish setting up your player profile',
      description: 'Your profile is incomplete. Provide the missing information to start enrolling.',
      priority: 'high',
      dismissible: false,
      action: {
        type: 'link',
        label: 'Complete Profile',
        href: '/profile/edit',
      },
    });
  }

  // 2. Start Playing (Priority: High, Dismissible)
  // Only for brand new players with no credits AND no membership
  if (hasNoMembership && hasNoCredits) {
    const isDismissed = isDismissedRecently(DISMISS_KEYS.startPlaying);
    if (!isDismissed) {
      items.push({
        id: 'start-playing',
        type: 'START_PLAYING',
        title: 'Start playing',
        description: 'Purchase credits or a membership to book your first class or drop-in session.',
        priority: 'high',
        dismissible: true,
        action: {
          type: 'link',
          label: 'Browse Options',
          href: '/membership',
        },
      });
    }
  } else {
    // Clear dismiss state if they now have credits/membership
    clearDismiss('start-playing');
  }

  // 3. Low Credits Upsell (Priority: Medium, Dismissible with 60-day cooldown)
  // Only for non-members with 1-2 credits remaining
  if (hasNoMembership && !hasNoCredits) {
    // Low class credits (1-2)
    if (classCredits >= 1 && classCredits <= 2) {
      const isDismissed = isDismissedRecently(DISMISS_KEYS.lowClassCredits, UPSELL_COOLDOWN_MS);
      if (!isDismissed) {
        items.push({
          id: 'low-class-credits',
          type: 'LOW_CLASS_CREDITS',
          title: 'Running low on class credits',
          description: `You have ${classCredits} class credit${classCredits !== 1 ? 's' : ''} remaining. Purchase more to keep playing!`,
          priority: 'medium',
          dismissible: true,
          action: {
            type: 'link',
            label: 'Buy Credits',
            href: '/membership',
          },
        });
      }
    }

    // Low drop-in credits (1-2)
    if (dropInCredits >= 1 && dropInCredits <= 2) {
      const isDismissed = isDismissedRecently(DISMISS_KEYS.lowDropinCredits, UPSELL_COOLDOWN_MS);
      if (!isDismissed) {
        items.push({
          id: 'low-dropin-credits',
          type: 'LOW_DROPIN_CREDITS',
          title: 'Running low on drop-in credits',
          description: `You have ${dropInCredits} drop-in credit${dropInCredits !== 1 ? 's' : ''} remaining.`,
          priority: 'medium',
          dismissible: true,
          action: {
            type: 'link',
            label: 'Buy Credits',
            href: '/membership',
          },
        });
      }
    }
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
