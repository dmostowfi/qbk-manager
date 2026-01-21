import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Competition } from '../../shared/types';
import dayjs from 'dayjs';
import { brand } from '../../constants/branding';

interface CompetitionCardProps {
  competition: Competition;
  onPress?: () => void;
}

const typeLabels: Record<string, string> = {
  LEAGUE: 'League',
  TOURNAMENT: 'Tournament',
};

const formatLabels: Record<string, string> = {
  INTERMEDIATE_4S: '4v4',
  RECREATIONAL_6S: '6v6',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION: 'Registration Open',
  ACTIVE: 'In Progress',
  COMPLETED: 'Completed',
};

export default function CompetitionCard({
  competition,
  onPress,
}: CompetitionCardProps) {
  const startDate = dayjs(competition.startDate);
  const teamCount = competition._count?.teams ?? competition.teams?.length ?? 0;
  const spotsLeft = competition.maxTeams - teamCount;
  const isFull = spotsLeft <= 0;
  const isRegistrationOpen = competition.status === 'REGISTRATION';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{competition.name}</Text>
          <View style={[styles.badge, styles[`badge_${competition.type}`]]}>
            <Text style={styles.badgeText}>
              {typeLabels[competition.type] || competition.type}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, styles[`status_${competition.status}`]]}>
          <Text style={styles.statusText}>
            {statusLabels[competition.status] || competition.status}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.format}>
          {formatLabels[competition.format] || competition.format} · ${competition.pricePerTeam}/team
        </Text>
        <Text style={styles.dateTime}>
          Starts {startDate.format('MMM D, YYYY')}
        </Text>
        {competition.registrationDeadline && isRegistrationOpen && (
          <Text style={styles.deadline}>
            Register by {dayjs(competition.registrationDeadline).format('MMM D')}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.capacity, isFull && styles.capacityFull]}>
          {teamCount}/{competition.maxTeams} teams
          {isRegistrationOpen && !isFull && ` · ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
        </Text>
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
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
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
  },
  badge_LEAGUE: { backgroundColor: '#f3e5f5' },
  badge_TOURNAMENT: { backgroundColor: '#fce4ec' },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: brand.colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  status_DRAFT: { backgroundColor: brand.colors.border },
  status_REGISTRATION: { backgroundColor: '#e8f5e9' },
  status_ACTIVE: { backgroundColor: brand.sidebar.activeBackground },
  status_COMPLETED: { backgroundColor: '#e3f2fd' },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: brand.colors.text,
  },
  details: {
    marginBottom: 12,
  },
  format: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.colors.text,
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: brand.colors.textLight,
    marginBottom: 2,
  },
  deadline: {
    fontSize: 13,
    color: brand.colors.warning,
    fontWeight: '500',
  },
  footer: {
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
});
