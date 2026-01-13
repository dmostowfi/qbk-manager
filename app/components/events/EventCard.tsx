import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Event } from '../../shared/types';
import dayjs from 'dayjs';

interface EventCardProps {
  event: Event;
  isEnrolled?: boolean;
  canEnroll?: boolean;
  onEnroll?: () => void;
  onUnenroll?: () => void;
  onPress?: () => void;
}

const eventTypeLabels: Record<string, string> = {
  CLASS: 'Class',
  OPEN_PLAY: 'Open Play',
  PRIVATE_EVENT: 'Private',
  TOURNAMENT: 'Tournament',
  LEAGUE: 'League',
  OTHER: 'Other',
};

const levelLabels: Record<string, string> = {
  INTRO_I: 'Intro I',
  INTRO_II: 'Intro II',
  INTRO_III: 'Intro III',
  INTRO_IV: 'Intro IV',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export default function EventCard({
  event,
  isEnrolled,
  canEnroll,
  onEnroll,
  onUnenroll,
  onPress,
}: EventCardProps) {
  const startTime = dayjs(event.startTime);
  const endTime = dayjs(event.endTime);
  const isFull = event.currentEnrollment >= event.maxCapacity;
  const spotsLeft = event.maxCapacity - event.currentEnrollment;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={[styles.badge, styles[`badge_${event.eventType}`]]}>
          <Text style={styles.badgeText}>
            {eventTypeLabels[event.eventType] || event.eventType}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.dateTime}>
          {startTime.format('ddd, MMM D')} · {startTime.format('h:mm A')} - {endTime.format('h:mm A')}
        </Text>
        <Text style={styles.meta}>
          Court {event.courtId} · {levelLabels[event.level] || event.level}
        </Text>
        {event.instructor && (
          <Text style={styles.instructor}>Instructor: {event.instructor}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.capacity, isFull && styles.capacityFull]}>
          {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
        </Text>

        {canEnroll && (
          <View style={styles.actions}>
            {isEnrolled ? (
              <TouchableOpacity
                style={[styles.button, styles.unenrollButton]}
                onPress={onUnenroll}
              >
                <Text style={styles.unenrollButtonText}>Unenroll</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.enrollButton, isFull && styles.buttonDisabled]}
                onPress={onEnroll}
                disabled={isFull}
              >
                <Text style={styles.enrollButtonText}>
                  {isFull ? 'Full' : 'Enroll'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  badge_CLASS: { backgroundColor: '#e3f2fd' },
  badge_OPEN_PLAY: { backgroundColor: '#e8f5e9' },
  badge_PRIVATE_EVENT: { backgroundColor: '#fff3e0' },
  badge_TOURNAMENT: { backgroundColor: '#fce4ec' },
  badge_LEAGUE: { backgroundColor: '#f3e5f5' },
  badge_OTHER: { backgroundColor: '#e0e0e0' },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  details: {
    marginBottom: 12,
  },
  dateTime: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  instructor: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  capacity: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  capacityFull: {
    color: '#f44336',
  },
  actions: {
    flexDirection: 'row',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  enrollButton: {
    backgroundColor: '#1976d2',
  },
  unenrollButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  enrollButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  unenrollButtonText: {
    color: '#d32f2f',
    fontWeight: '600',
  },
});
