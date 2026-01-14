import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from 'expo-router';
import { useAppAuth } from '../../contexts/AuthContext';
import { enrollmentsApi, meApi, eventsApi } from '../../shared/api/services';
import { Event, Enrollment, EventFilters as EventFiltersType, EventFormData } from '../../shared/types';
import EventCard from '../../components/events/EventCard';
import EventForm from '../../components/events/EventForm';
import EventFilters from '../../components/events/EventFilters';
import EventCalendar from '../../components/events/EventCalendar';
import { brand } from '../../constants/branding';

type ViewMode = 'list' | 'calendar';
type TimeFilter = 'all' | 'upcoming' | 'past';

export default function EventsScreen() {
  const { role, userId, loading: authLoading } = useAppAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<EventFiltersType>({});

  // View and modal states
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');

  const isPlayer = role === 'player';
  const canEdit = role === 'admin' || role === 'staff';

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    const now = new Date();

    // Filter by time
    const timeFiltered = events.filter((event) => {
      const eventStart = new Date(event.startTime);
      if (timeFilter === 'upcoming') return eventStart >= now;
      if (timeFilter === 'past') return eventStart < now;
      return true; // 'all'
    });

    // Sort by start time ascending (earliest first for upcoming, latest first for past)
    return timeFiltered.sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();
      if (timeFilter === 'past') {
        return dateB - dateA; // Most recent past events first
      }
      return dateA - dateB; // Earliest upcoming events first
    });
  }, [events, timeFilter]);

  const fetchEvents = useCallback(async (currentFilters?: EventFiltersType) => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventsApi.getAll(currentFilters || filters);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchMyEnrollments = useCallback(async () => {
    if (!isPlayer) return;
    try {
      const enrollments = await meApi.getEnrollments();
      setMyEnrollments(enrollments);
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
    }
  }, [isPlayer]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!authLoading && isPlayer) {
      fetchMyEnrollments();
    }
  }, [authLoading, isPlayer, fetchMyEnrollments]);

  // Refetch events when tab gains focus to ensure fresh data
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      if (isPlayer) {
        fetchMyEnrollments();
      }
    }, [fetchEvents, fetchMyEnrollments, isPlayer])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchMyEnrollments()]);
    setRefreshing(false);
  };

  const handleApplyFilters = (newFilters: EventFiltersType) => {
    setFilters(newFilters);
    fetchEvents(newFilters);
  };

  const isEnrolledInEvent = (eventId: string) => {
    return myEnrollments.some(
      (e) => e.eventId === eventId && e.status === 'REGISTERED'
    );
  };

  const getEnrollmentId = (eventId: string) => {
    const enrollment = myEnrollments.find(
      (e) => e.eventId === eventId && e.status === 'REGISTERED'
    );
    return enrollment?.id;
  };

  const handleEnroll = async (event: Event) => {
    if (!userId) return;

    try {
      await enrollmentsApi.enroll(event.id, [userId]);
      await fetchMyEnrollments();
      await fetchEvents();
    } catch (err: any) {
      Alert.alert('Enrollment Failed', err.message || 'Could not enroll in event');
    }
  };

  const handleUnenroll = async (event: Event) => {
    const enrollmentId = getEnrollmentId(event.id);
    if (!enrollmentId) return;

    try {
      await enrollmentsApi.unenroll(event.id, [enrollmentId]);
      await fetchMyEnrollments();
      await fetchEvents();
    } catch (err: any) {
      Alert.alert('Unenroll Failed', err.message || 'Could not unenroll from event');
    }
  };

  const handleCreateEvent = async (data: EventFormData) => {
    await eventsApi.create(data);
    await fetchEvents();
  };

  const handleUpdateEvent = async (data: EventFormData) => {
    if (!editingEvent) return;
    await eventsApi.update(editingEvent.id, data);
    await fetchEvents();
  };

  const handleEventPress = (event: Event) => {
    if (canEdit) {
      setEditingEvent(event);
      setShowForm(true);
    }
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const hasActiveFilters = filters.eventType || filters.level || filters.gender;

  const handleCloseForm = async () => {
    setShowForm(false);
    setEditingEvent(null);
    // Refetch events to get updated enrollment data
    await fetchEvents();
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <EventCard
      event={item}
      isEnrolled={isEnrolledInEvent(item.id)}
      canEnroll={isPlayer}
      onEnroll={() => handleEnroll(item)}
      onUnenroll={() => handleUnenroll(item)}
      onPress={() => handleEventPress(item)}
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'calendar' : 'list');
  };

  return (
    <View style={styles.container}>
      {/* Time Filter Toggle - only show in list view */}
      {viewMode === 'list' && (
        <View style={styles.timeFilterContainer}>
          {(['upcoming', 'past', 'all'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.timeFilterButton, timeFilter === filter && styles.timeFilterButtonActive]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text style={[styles.timeFilterText, timeFilter === filter && styles.timeFilterTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Header Actions */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.headerButton, hasActiveFilters && styles.headerButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <FontAwesome name="filter" size={16} color={hasActiveFilters ? '#fff' : brand.colors.primary} />
            <Text style={[styles.headerButtonText, hasActiveFilters && styles.headerButtonTextActive]}>
              Filter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewToggle}
            onPress={toggleViewMode}
          >
            <FontAwesome
              name={viewMode === 'list' ? 'calendar' : 'list'}
              size={16}
              color={brand.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {canEdit && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddEvent}>
            <FontAwesome name="plus" size={16} color="#fff" />
            <Text style={styles.addButtonText}>New Event</Text>
          </TouchableOpacity>
        )}
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={filteredAndSortedEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {timeFilter === 'upcoming' ? 'No upcoming events' :
                 timeFilter === 'past' ? 'No past events' : 'No events found'}
              </Text>
            </View>
          }
        />
      ) : (
        <EventCalendar
          events={filteredAndSortedEvents}
          isEnrolled={isEnrolledInEvent}
          canEnroll={isPlayer}
          canEdit={canEdit}
          onEnroll={handleEnroll}
          onUnenroll={handleUnenroll}
          onEventPress={handleEventPress}
        />
      )}

      {/* Filters Modal */}
      <EventFilters
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
      />

      {/* Event Form Modal */}
      <EventForm
        visible={showForm}
        event={editingEvent}
        onClose={handleCloseForm}
        onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: brand.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  timeFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: brand.colors.background,
  },
  timeFilterButtonActive: {
    backgroundColor: brand.colors.primary,
  },
  timeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.colors.textLight,
  },
  timeFilterTextActive: {
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: brand.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.colors.primary,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.colors.primary,
    gap: 6,
  },
  headerButtonActive: {
    backgroundColor: brand.colors.primary,
  },
  headerButtonText: {
    color: brand.colors.primary,
    fontWeight: '500',
  },
  headerButtonTextActive: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: brand.colors.primary,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: brand.colors.textLight,
  },
  errorText: {
    fontSize: 16,
    color: brand.colors.error,
    textAlign: 'center',
    padding: 20,
  },
});
