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
