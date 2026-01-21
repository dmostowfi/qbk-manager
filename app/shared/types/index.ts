// Event types
export type EventType = 'CLASS' | 'OPEN_PLAY' | 'PRIVATE_EVENT' | 'TOURNAMENT' | 'LEAGUE' | 'OTHER';
export type SkillLevel = 'INTRO_I' | 'INTRO_II' | 'INTRO_III' | 'INTRO_IV' | 'INTERMEDIATE' | 'ADVANCED';
export type GenderCategory = 'MENS' | 'WOMENS' | 'COED';
export type EventStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

// Role types
export type AppRole = 'admin' | 'staff' | 'player';

// Player types
export type MembershipType = 'GOLD' | 'DROP_IN' | 'NONE';
export type MembershipStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type EnrollmentStatus = 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';

export interface Event {
  id: string;
  title: string;
  description?: string;
  eventType: EventType;
  courtId: number;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentEnrollment: number;
  instructor?: string;
  level: SkillLevel;
  gender: GenderCategory;
  isYouth: boolean;
  isRecurring: boolean;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  enrollments?: Enrollment[];
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  statusUpdatedAt: string;
  classCredits: number;
  dropInCredits: number;
  profileCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AppRole;
  // Player-specific fields (optional)
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
  tosAcceptedAt?: string;
  privacyAcceptedAt?: string;
  waiverSignedAt?: string;
  profileCompletedAt?: string;
  membershipType?: MembershipType;
  membershipStatus?: MembershipStatus;
  classCredits?: number;
  dropInCredits?: number;
}

export interface Enrollment {
  id: string;
  playerId: string;
  eventId: string;
  status: EnrollmentStatus;
  createdAt: string;
  player?: Player;
  event?: Event;
}

export interface EventFormData {
  title: string;
  description?: string;
  eventType: EventType;
  courtId: number;
  startTime: Date;
  endTime: Date;
  maxCapacity: number;
  instructor?: string;
  level: SkillLevel;
  gender: GenderCategory;
  isYouth: boolean;
  isRecurring: boolean;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter types
export interface EventFilters {
  startDate?: string;
  endDate?: string;
  eventType?: EventType;
  courtId?: number;
  level?: SkillLevel;
  gender?: GenderCategory;
  isYouth?: boolean;
  status?: EventStatus;
}

// Action Items
export type ActionItemType =
  | 'COMPLETE_PROFILE'
  | 'START_PLAYING'
  | 'LOW_CLASS_CREDITS'
  | 'LOW_DROPIN_CREDITS';

export type ActionItemPriority = 'high' | 'medium' | 'low';

export interface ActionItemAction {
  type: 'link' | 'button';
  label: string;
  href?: string;
}

export interface ActionItem {
  id: string;
  type: ActionItemType;
  title: string;
  description: string;
  priority: ActionItemPriority;
  dismissible: boolean;
  action?: ActionItemAction;
}

// Messages
export type MessageType = 'info' | 'success' | 'warning';

export interface Message {
  id: string;
  type: MessageType;
  title: string;
  body: string;
  createdAt: string;
}

// Transactions
export type TransactionType =
  | 'MEMBERSHIP_PURCHASE'
  | 'CREDIT_PURCHASE'
  | 'CLASS_ENROLLMENT'
  | 'DROP_IN'
  | 'REFUND';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  amount: number; // positive = charge, negative = credit/refund
}

// Products (from Stripe)
export interface ProductPrice {
  id: string;
  unitAmount: number | null;
  currency: string;
  recurring: {
    interval: 'month' | 'year';
    interval_count: number;
  } | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  metadata: {
    membershipType?: string;
    classCredits?: string;
    dropInCredits?: string;
  };
  price: ProductPrice | null;
}

// Competition types
export type CompetitionType = 'LEAGUE' | 'TOURNAMENT';
export type CompetitionFormat = 'INTERMEDIATE_4S' | 'RECREATIONAL_6S';
export type CompetitionStatus = 'DRAFT' | 'REGISTRATION' | 'ACTIVE' | 'COMPLETED';
export type TeamStatus = 'PENDING' | 'CONFIRMED';
export type TeamPaymentType = 'FULL' | 'SPLIT';
export type TeamPaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED';

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  format: CompetitionFormat;
  startDate: string;
  endDate?: string;
  pricePerTeam: number;
  maxTeams: number;
  status: CompetitionStatus;
  registrationDeadline?: string;
  createdAt: string;
  updatedAt: string;
  teams?: Team[];
  _count?: { teams: number };
}

export interface Team {
  id: string;
  name: string;
  competitionId: string;
  captainId: string;
  status: TeamStatus;
  paidInFull: boolean;
  createdAt: string;
  updatedAt: string;
  roster?: TeamRoster[];
  captain?: Player;
  competition?: Competition;
  payments?: TeamPayment[];
}

export interface TeamRoster {
  id: string;
  teamId: string;
  playerId: string;
  joinedAt: string;
  player?: Player;
  team?: Team;
}

export interface Match {
  id: string;
  competitionId: string;
  eventId: string;
  homeTeamId: string;
  awayTeamId: string;
  roundNumber: number;
  isPlayoff: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
  createdAt: string;
  event?: Event;
  homeTeam?: Team;
  awayTeam?: Team;
}

export interface TeamPayment {
  id: string;
  teamId: string;
  playerId: string;
  amount: number;
  paymentType: TeamPaymentType;
  stripeSessionId?: string;
  status: TeamPaymentStatus;
  paidAt?: string;
  createdAt: string;
  player?: Player;
}

export interface TeamPaymentStatusResponse {
  teamId: string;
  teamStatus: TeamStatus;
  paidInFull: boolean;
  paidBy?: string;
  totalAmount: number;
  playerShare?: number;
  amountPaid: number;
  amountOwed: number;
  playerPayments: {
    playerId: string;
    playerName: string;
    email: string;
    amountOwed: number;
    amountPaid: number;
    paid: boolean;
    paidAt: string | null;
  }[];
  playersRemaining?: number;
}

export interface Standing {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  gamesPlayed: number;
}

export interface CompetitionFilters {
  status?: CompetitionStatus;
  type?: CompetitionType;
  format?: CompetitionFormat;
}

export interface CompetitionFormData {
  name: string;
  type: CompetitionType;
  format: CompetitionFormat;
  startDate: Date;
  endDate?: Date;
  pricePerTeam: number;
  maxTeams: number;
  registrationDeadline?: Date;
}

export interface TeamFormData {
  name: string;
}

export interface ScheduleConfig {
  startDate: Date;
  dayOfWeek: number;
  numberOfWeeks: number;
  courtIds: number[];
}
