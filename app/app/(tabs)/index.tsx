import { useState, useEffect, useCallback } from 'react';
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
import { useAppAuth } from '../../contexts/AuthContext';
import { enrollmentsApi, meApi, eventsApi } from '../../shared/api/services';
import { Event, Enrollment, EventFilters as EventFiltersType, EventFormData } from '../../shared/types';
import EventCard from '../../components/events/EventCard';
import EventForm from '../../components/events/EventForm';
import EventFilters from '../../components/events/EventFilters';
import EventCalendar from '../../components/events/EventCalendar';

type ViewMode = 'list' | 'calendar';

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

  const isPlayer = role === 'player';
  const canEdit = role === 'admin' || role === 'staff';

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
        <ActivityIndicator size="large" color="#1976d2" />
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
      {/* Header Actions */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.headerButton, hasActiveFilters && styles.headerButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <FontAwesome name="filter" size={16} color={hasActiveFilters ? '#fff' : '#1976d2'} />
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
              color="#1976d2"
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
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No events found</Text>
            </View>
          }
        />
      ) : (
        <EventCalendar
          events={events}
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
        onClose={() => {
          setShowForm(false);
          setEditingEvent(null);
        }}
        onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    borderColor: '#1976d2',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1976d2',
    gap: 6,
  },
  headerButtonActive: {
    backgroundColor: '#1976d2',
  },
  headerButtonText: {
    color: '#1976d2',
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
    backgroundColor: '#1976d2',
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
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    padding: 20,
  },
});
