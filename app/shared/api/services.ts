import axios from 'axios';
import {
  Event,
  EventFormData,
  EventFilters,
  ApiResponse,
  Player,
  Enrollment,
  UserProfile,
  Product,
  Competition,
  CompetitionFilters,
  CompetitionFormData,
  Team,
  Match,
  Standing,
  TeamPaymentStatusResponse,
  ScheduleConfig,
} from '../types';

export interface PlayerFilters {
  membershipType?: string;
  membershipStatus?: string;
  search?: string;
}

export interface PlayerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
  membershipType: string;
  membershipStatus: string;
  classCredits: number;
  dropInCredits: number;
}

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set auth token for requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Response interceptor: extract backend error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract the actual error message from the backend response
    if (error.response?.data?.error) {
      error.message = error.response.data.error;
    } else if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  }
);

// Events API
export const eventsApi = {
  getAll: async (filters?: EventFilters): Promise<Event[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<ApiResponse<Event[]>>(`/events?${params}`);
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get<ApiResponse<Event>>(`/events/${id}`);
    return response.data.data!;
  },

  create: async (data: EventFormData): Promise<Event> => {
    const payload = {
      ...data,
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
    };
    const response = await api.post<ApiResponse<Event>>('/events', payload);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<EventFormData>): Promise<Event> => {
    const payload = {
      ...data,
      ...(data.startTime && { startTime: data.startTime.toISOString() }),
      ...(data.endTime && { endTime: data.endTime.toISOString() }),
    };
    const response = await api.put<ApiResponse<Event>>(`/events/${id}`, payload);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },
};

// Players API
export const playersApi = {
  getAll: async (filters?: PlayerFilters): Promise<Player[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<ApiResponse<Player[]>>(`/players?${params}`);
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Player> => {
    const response = await api.get<ApiResponse<Player>>(`/players/${id}`);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<PlayerFormData>): Promise<Player> => {
    const response = await api.put<ApiResponse<Player>>(`/players/${id}`, data);
    return response.data.data!;
  },
};

// Enrollments API
export const enrollmentsApi = {
  enroll: async (eventId: string, playerIds: string[]): Promise<Enrollment[]> => {
    const response = await api.post<ApiResponse<Enrollment[]>>(`/events/${eventId}/enroll`, { playerIds });
    return response.data.data!;
  },

  unenroll: async (eventId: string, enrollmentIds: string[]): Promise<void> => {
    await api.post(`/events/${eventId}/unenroll`, { enrollmentIds });
  },
};

// Transaction type from backend
export interface BackendTransaction {
  id: string;
  playerId: string;
  stripeProductId: string;
  productName: string | null;
  stripeSessionId: string | null;
  amount: string; // Decimal comes as string from Prisma
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

// Agreement types
export type AgreementType = 'tos' | 'privacy' | 'waiver';

// Profile update data (player-editable fields only)
export interface ProfileUpdateData {
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
}

// Me API (current user's own data)
export const meApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<ApiResponse<UserProfile>>('/me');
    return response.data.data!;
  },

  updateProfile: async (data: ProfileUpdateData): Promise<UserProfile> => {
    const response = await api.put<ApiResponse<UserProfile>>('/me', data);
    return response.data.data!;
  },

  getEnrollments: async (): Promise<Enrollment[]> => {
    const response = await api.get<ApiResponse<Enrollment[]>>('/me/enrollments');
    return response.data.data || [];
  },

  getTransactions: async (): Promise<BackendTransaction[]> => {
    const response = await api.get<ApiResponse<BackendTransaction[]>>('/me/transactions');
    return response.data.data || [];
  },

  signAgreement: async (agreementType: AgreementType): Promise<{ agreementType: string; signedAt: string }> => {
    const response = await api.post<ApiResponse<{ agreementType: string; signedAt: string }>>('/me/sign', { agreementType });
    return response.data.data!;
  },

  getTeams: async (): Promise<Team[]> => {
    const response = await api.get<ApiResponse<Team[]>>('/me/teams');
    return response.data.data || [];
  },
};

// Products API (Stripe products)
export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/products');
    return response.data;
  },
};

// Checkout API
export const checkoutApi = {
  createSession: async (priceId: string): Promise<{ url: string }> => {
    const response = await api.post<{ url: string }>('/checkout/session', { priceId });
    return response.data;
  },
};

// Competitions API
export const competitionsApi = {
  getAll: async (filters?: CompetitionFilters): Promise<Competition[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<ApiResponse<Competition[]>>(`/competitions?${params}`);
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Competition> => {
    const response = await api.get<ApiResponse<Competition>>(`/competitions/${id}`);
    return response.data.data!;
  },

  create: async (data: CompetitionFormData): Promise<Competition> => {
    const payload = {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate?.toISOString(),
      registrationDeadline: data.registrationDeadline?.toISOString(),
    };
    const response = await api.post<ApiResponse<Competition>>('/competitions', payload);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<CompetitionFormData>): Promise<Competition> => {
    const payload = {
      ...data,
      ...(data.startDate && { startDate: data.startDate.toISOString() }),
      ...(data.endDate && { endDate: data.endDate.toISOString() }),
      ...(data.registrationDeadline && { registrationDeadline: data.registrationDeadline.toISOString() }),
    };
    const response = await api.put<ApiResponse<Competition>>(`/competitions/${id}`, payload);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/competitions/${id}`);
  },

  updateStatus: async (id: string, status: string): Promise<Competition> => {
    const response = await api.put<ApiResponse<Competition>>(`/competitions/${id}/status`, { status });
    return response.data.data!;
  },

  generateSchedule: async (id: string, config: ScheduleConfig): Promise<{ matchesCreated: number; matches: Match[] }> => {
    const payload = {
      startDate: config.startDate.toISOString(),
      dayOfWeek: config.dayOfWeek,
      numberOfWeeks: config.numberOfWeeks,
      courtIds: config.courtIds,
    };
    const response = await api.post<ApiResponse<{ matchesCreated: number; matches: Match[] }>>(`/competitions/${id}/schedule`, payload);
    return response.data.data!;
  },

  getMatches: async (id: string): Promise<Match[]> => {
    const response = await api.get<ApiResponse<Match[]>>(`/competitions/${id}/matches`);
    return response.data.data || [];
  },

  recordScore: async (competitionId: string, matchId: string, team1Score: number, team2Score: number): Promise<Match> => {
    const response = await api.put<ApiResponse<Match>>(`/competitions/${competitionId}/matches/${matchId}/score`, { team1Score, team2Score });
    return response.data.data!;
  },

  getStandings: async (id: string): Promise<Standing[]> => {
    const response = await api.get<ApiResponse<Standing[]>>(`/competitions/${id}/standings`);
    return response.data.data || [];
  },
};

// Teams API
export const teamsApi = {
  getByCompetition: async (competitionId: string): Promise<Team[]> => {
    const response = await api.get<ApiResponse<Team[]>>(`/competitions/${competitionId}/teams`);
    return response.data.data || [];
  },

  getById: async (competitionId: string, teamId: string): Promise<Team> => {
    const response = await api.get<ApiResponse<Team>>(`/competitions/${competitionId}/teams/${teamId}`);
    return response.data.data!;
  },

  register: async (competitionId: string, data: { name: string }): Promise<Team> => {
    const response = await api.post<ApiResponse<Team>>(`/competitions/${competitionId}/teams`, data);
    return response.data.data!;
  },

  addToRoster: async (competitionId: string, teamId: string, playerId: string): Promise<Team> => {
    const response = await api.post<ApiResponse<Team>>(`/competitions/${competitionId}/teams/${teamId}/roster`, { playerId });
    return response.data.data!;
  },

  removeFromRoster: async (competitionId: string, teamId: string, playerId: string): Promise<Team> => {
    const response = await api.delete<ApiResponse<Team>>(`/competitions/${competitionId}/teams/${teamId}/roster/${playerId}`);
    return response.data.data!;
  },

  validateRoster: async (competitionId: string, teamId: string): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await api.get<ApiResponse<{ valid: boolean; errors: string[] }>>(`/competitions/${competitionId}/teams/${teamId}/validate`);
    return response.data.data!;
  },

  searchPlayersForRoster: async (competitionId: string, teamId: string, search: string): Promise<Player[]> => {
    const response = await api.get<ApiResponse<Player[]>>(`/competitions/${competitionId}/teams/${teamId}/roster/search?search=${encodeURIComponent(search)}`);
    return response.data.data || [];
  },

  getPaymentStatus: async (competitionId: string, teamId: string): Promise<TeamPaymentStatusResponse> => {
    const response = await api.get<ApiResponse<TeamPaymentStatusResponse>>(`/competitions/${competitionId}/teams/${teamId}/payments`);
    return response.data.data!;
  },

  createCheckout: async (competitionId: string, teamId: string, paymentType: 'FULL' | 'SPLIT'): Promise<{ url: string; amount: number }> => {
    const response = await api.post<ApiResponse<{ url: string; amount: number }>>(`/competitions/${competitionId}/teams/${teamId}/checkout`, { paymentType });
    return response.data.data!;
  },
};

export default api;
