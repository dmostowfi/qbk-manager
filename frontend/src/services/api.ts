import axios from 'axios';
import { Event, EventFormData, EventFilters, ApiResponse } from '../types';

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

// Players API (scaffolded for future)
export const playersApi = {
  getAll: async (): Promise<unknown[]> => {
    const response = await api.get('/players');
    return response.data.data || [];
  },

  getById: async (id: string): Promise<unknown> => {
    const response = await api.get(`/players/${id}`);
    return response.data.data;
  },
};

export default api;
