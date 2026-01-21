import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Team } from '../../shared/types';
import { brand } from '../../constants/branding';

interface TeamCardProps {
  team: Team;
  onPress?: () => void;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Registration Pending',
  CONFIRMED: 'Confirmed',
};

export default function TeamCard({ team, onPress }: TeamCardProps) {
  const rosterCount = team.roster?.length ?? 0;
  const captainName = team.captain
    ? `${team.captain.firstName} ${team.captain.lastName}`
    : 'Unknown';
  const isConfirmed = team.status === 'CONFIRMED';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{team.name}</Text>
        <View style={[styles.statusBadge, isConfirmed ? styles.statusConfirmed : styles.statusPending]}>
          <Text style={[styles.statusText, isConfirmed && styles.statusTextConfirmed]}>
            {statusLabels[team.status] || team.status}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <FontAwesome name="user" size={14} color={brand.colors.textLight} />
          <Text style={styles.detailText}>Captain: {captainName}</Text>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="users" size={14} color={brand.colors.textLight} />
          <Text style={styles.detailText}>{rosterCount} player{rosterCount !== 1 ? 's' : ''}</Text>
        </View>
        {team.paidInFull && (
          <View style={styles.detailRow}>
            <FontAwesome name="check-circle" size={14} color={brand.colors.success} />
            <Text style={[styles.detailText, { color: brand.colors.success }]}>Paid in full</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: '#FFF8E1',
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
  },
  statusTextConfirmed: {
    color: brand.colors.success,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: brand.colors.textLight,
  },
});
