// Re-export Prisma types for convenience
export type {
  Player,
  Event,
  Enrollment,
  Transaction,
  MembershipType,
  MembershipStatus,
  TransactionType,
  EnrollmentStatus,
  EventType,
  SkillLevel,
  GenderCategory,
  EventStatus,
} from '@prisma/client';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Event filters
export interface EventFilters {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  courtId?: number;
  level?: string;
  gender?: string;
  isYouth?: boolean;
  status?: string;
}

// Player filters
export interface PlayerFilters {
  membershipType?: string;
  membershipStatus?: string;
  search?: string;
}
