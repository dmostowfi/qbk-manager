import { useState, useEffect, useCallback } from 'react';
import { Event, EventFormData, EventFilters } from '../types';
import { eventsApi } from '../services/api';

export function useEvents(initialFilters?: EventFilters) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>(initialFilters || {});

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventsApi.getAll(filters);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (data: EventFormData) => {
    const newEvent = await eventsApi.create(data);
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  };

  const updateEvent = async (id: string, data: Partial<EventFormData>) => {
    const updated = await eventsApi.update(id, data);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  };

  const deleteEvent = async (id: string) => {
    await eventsApi.delete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    events,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
