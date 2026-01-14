import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Event } from '../../shared/types';
import dayjs from 'dayjs';
import { brand } from '../../constants/branding';

interface EventCardProps {
  event: Event;
  isEnrolled?: boolean;
  canEnroll?: boolean;
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
                onPress={onPress}
              >
                <Text style={styles.unenrollButtonText}>Unenroll</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.enrollButton, isFull && styles.buttonDisabled]}
                onPress={onPress}
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
    backgroundColor: brand.colors.surface,
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
    color: brand.colors.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: brand.colors.border,
  },
  badge_CLASS: { backgroundColor: brand.sidebar.activeBackground },
  badge_OPEN_PLAY: { backgroundColor: '#e8f5e9' },
  badge_PRIVATE_EVENT: { backgroundColor: '#fff3e0' },
  badge_TOURNAMENT: { backgroundColor: '#fce4ec' },
  badge_LEAGUE: { backgroundColor: '#f3e5f5' },
  badge_OTHER: { backgroundColor: brand.colors.border },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: brand.colors.text,
  },
  details: {
    marginBottom: 12,
  },
  dateTime: {
    fontSize: 14,
    color: brand.colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: brand.colors.textLight,
    marginBottom: 2,
  },
  instructor: {
    fontSize: 14,
    color: brand.colors.textLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: brand.colors.border,
    paddingTop: 12,
  },
  capacity: {
    fontSize: 14,
    color: brand.colors.success,
    fontWeight: '500',
  },
  capacityFull: {
    color: brand.colors.error,
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
    backgroundColor: brand.colors.primary,
  },
  unenrollButton: {
    backgroundColor: brand.colors.surface,
    borderWidth: 1,
    borderColor: brand.colors.error,
  },
  buttonDisabled: {
    backgroundColor: brand.colors.border,
  },
  enrollButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  unenrollButtonText: {
    color: brand.colors.error,
    fontWeight: '600',
  },
});
