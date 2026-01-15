# Roadmap: Action Items Rule Engine

## Current State (Option 3: Computed on Read)
Action items are computed client-side from the player's profile data when they view their dashboard. This is simple and always fresh, but has limitations:
- Logic lives in frontend code
- Can only use data already fetched (profile)
- No history/audit trail
- Can't trigger notifications

## Target State (Option 2: Rule Engine)
A backend service that evaluates configurable rules against player state and generates action items.

---

## Phase 1: Backend Endpoint (No Rules Table Yet)

**Goal**: Move computation to backend, keep rules in code.

### Implementation
1. Create `GET /api/me/action-items` endpoint
2. Move `computeActionItems()` logic from frontend to backend
3. Backend has access to more data (enrollments, payment history, etc.)
4. Frontend fetches action items like any other API call

### Code Structure
```typescript
// backend/src/services/actionItemService.ts
export function computeActionItems(player: Player): ActionItem[] {
  const items: ActionItem[] = [];

  // Rule: Low credits
  if (player.classCredits <= 2 && player.membershipType === 'NONE') {
    items.push({
      type: 'UPGRADE_MEMBERSHIP',
      title: 'Running low on credits',
      description: 'Upgrade to Gold for unlimited classes',
      priority: 'medium',
      action: { type: 'link', href: '/membership' }
    });
  }

  // Rule: Inactive for 30 days
  // (requires enrollment history - not available on frontend)
  const lastAttendance = await getLastAttendance(player.id);
  if (daysBetween(lastAttendance, now) > 30) {
    items.push({
      type: 'WELCOME_BACK',
      title: 'We miss you!',
      description: 'Book a class and get back in the game',
      priority: 'low',
      action: { type: 'link', href: '/events' }
    });
  }

  return items;
}
```

### Benefits
- Access to full player history (enrollments, payments)
- Single source of truth for business logic
- Frontend stays thin

---

## Phase 2: Configurable Rules Table

**Goal**: Make rules data-driven so non-engineers can modify them.

### Database Schema
```sql
CREATE TABLE action_rules (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  priority VARCHAR(20) DEFAULT 'medium',

  -- Conditions (JSON array)
  conditions JSONB NOT NULL,

  -- Action item template
  action_type VARCHAR(50) NOT NULL,
  action_title VARCHAR(200) NOT NULL,
  action_description TEXT,
  action_href VARCHAR(200),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Condition Schema
```typescript
interface Condition {
  field: string;           // e.g., 'classCredits', 'membershipType', 'daysSinceLastVisit'
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn';
  value: any;
}

// Example rule in database:
{
  name: 'Low Credits Warning',
  conditions: [
    { field: 'classCredits', operator: 'lte', value: 2 },
    { field: 'membershipType', operator: 'eq', value: 'NONE' }
  ],
  action_type: 'UPGRADE_MEMBERSHIP',
  action_title: 'Running low on credits',
  action_description: 'Upgrade to Gold for unlimited classes',
  action_href: '/membership'
}
```

### Rule Engine
```typescript
// backend/src/services/ruleEngine.ts
export async function evaluateRules(player: PlayerContext): Promise<ActionItem[]> {
  const rules = await db.actionRules.findMany({ where: { enabled: true } });
  const items: ActionItem[] = [];

  for (const rule of rules) {
    if (evaluateConditions(rule.conditions, player)) {
      items.push({
        type: rule.action_type,
        title: interpolate(rule.action_title, player),
        description: interpolate(rule.action_description, player),
        priority: rule.priority,
        action: { type: 'link', href: rule.action_href }
      });
    }
  }

  return items;
}

function evaluateConditions(conditions: Condition[], context: PlayerContext): boolean {
  return conditions.every(cond => {
    const value = getFieldValue(context, cond.field);
    switch (cond.operator) {
      case 'eq': return value === cond.value;
      case 'lte': return value <= cond.value;
      // ... other operators
    }
  });
}
```

### Admin UI
- Rules list page (admin only)
- Create/edit rule form
- Toggle rules on/off
- Preview which players match a rule

---

## Phase 3: Derived Fields & Computed Context

**Goal**: Support complex conditions that require computation.

### Problem
Some conditions need derived data:
- "Days since last visit" (requires query)
- "Upcoming enrollment count" (requires query)
- "Total spend this month" (requires aggregation)

### Solution: PlayerContext Builder
```typescript
interface PlayerContext extends Player {
  // Derived fields
  daysSinceLastVisit: number;
  upcomingEnrollmentCount: number;
  totalSpendThisMonth: number;
  enrollmentStreak: number;
}

async function buildPlayerContext(playerId: string): Promise<PlayerContext> {
  const [player, lastVisit, upcomingCount, monthlySpend] = await Promise.all([
    db.players.findUnique({ where: { id: playerId } }),
    getLastAttendanceDate(playerId),
    getUpcomingEnrollmentCount(playerId),
    getMonthlySpend(playerId),
  ]);

  return {
    ...player,
    daysSinceLastVisit: daysBetween(lastVisit, new Date()),
    upcomingEnrollmentCount: upcomingCount,
    totalSpendThisMonth: monthlySpend,
    enrollmentStreak: await calculateStreak(playerId),
  };
}
```

### Available Fields for Rules
Document all available fields for rule creation:
| Field | Type | Description |
|-------|------|-------------|
| `classCredits` | number | Current class credit balance |
| `dropInCredits` | number | Current drop-in credit balance |
| `membershipType` | enum | GOLD, DROP_IN, NONE |
| `membershipStatus` | enum | ACTIVE, PAUSED, CANCELLED |
| `daysSinceLastVisit` | number | Days since last attended event |
| `upcomingEnrollmentCount` | number | Events enrolled in future |
| `totalSpendThisMonth` | number | $ spent this calendar month |

---

## Phase 4: Notifications & Dismissals

**Goal**: Push action items via email/SMS, let users dismiss them.

### Dismissals Table
```sql
CREATE TABLE action_item_dismissals (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  rule_id UUID REFERENCES action_rules(id),
  dismissed_at TIMESTAMP DEFAULT NOW(),
  -- Optional: auto-resurface after X days
  resurface_after TIMESTAMP
);
```

### Modified Query
```typescript
async function getActionItems(playerId: string): Promise<ActionItem[]> {
  const context = await buildPlayerContext(playerId);
  const rules = await db.actionRules.findMany({ where: { enabled: true } });
  const dismissals = await db.dismissals.findMany({
    where: { playerId, resurfaceAfter: { gt: new Date() } }
  });
  const dismissedRuleIds = new Set(dismissals.map(d => d.ruleId));

  return rules
    .filter(rule => !dismissedRuleIds.has(rule.id))
    .filter(rule => evaluateConditions(rule.conditions, context))
    .map(rule => toActionItem(rule, context));
}
```

### Notification Service
```typescript
// Scheduled job (daily)
async function sendActionItemNotifications() {
  const players = await db.players.findMany({ where: { membershipStatus: 'ACTIVE' } });

  for (const player of players) {
    const items = await getActionItems(player.id);
    const highPriority = items.filter(i => i.priority === 'high');

    if (highPriority.length > 0) {
      await sendEmail(player.email, 'action-items', { items: highPriority });
    }
  }
}
```

---

## Migration Path

| Phase | Effort | Dependencies | Value |
|-------|--------|--------------|-------|
| Phase 1 | 1-2 days | None | Backend control, richer data |
| Phase 2 | 3-5 days | Phase 1 | Admin-configurable rules |
| Phase 3 | 2-3 days | Phase 2 | Complex business rules |
| Phase 4 | 3-4 days | Phase 2 | Proactive engagement |

## Example Rules to Implement

1. **Low Credits** - Credits <= 2 and no membership
2. **Membership Expiring** - Expires within 7 days
3. **Welcome Back** - No attendance in 30+ days
4. **Complete Profile** - Missing phone or DOB
5. **First Class Discount** - New player, no enrollments yet
6. **Loyalty Reward** - 10+ classes attended this month
