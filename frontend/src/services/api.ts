import axios from 'axios';
import { Event, EventFormData, EventFilters, ApiResponse, Player, Enrollment } from '../types';

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
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;
