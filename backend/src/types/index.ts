// Re-export Prisma types for convenience
export type {
  Player,
  Event,
  Enrollment,
  Transaction,
  MembershipType,
  MembershipStatus,
  TransactionStatus,
  EnrollmentStatus,
  EventType,
  SkillLevel,
  GenderCategory,
  EventStatus,
} from '@prisma/client';

// Auth types
export type AppRole = 'admin' | 'staff' | 'player';

export interface AuthContext {
  userId: string;      // Clerk user ID
  role: AppRole;       // Resolved application role
  playerId?: string;   // Player ID if role is 'player' and acting on self
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

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
