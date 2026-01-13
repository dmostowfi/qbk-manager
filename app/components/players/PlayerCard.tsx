import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Player } from '../../shared/types';

interface PlayerCardProps {
  player: Player;
  onPress?: () => void;
}

const membershipLabels: Record<string, string> = {
  GOLD: 'Gold',
  DROP_IN: 'Drop-in',
  NONE: 'None',
};

const statusColors: Record<string, string> = {
  ACTIVE: '#4caf50',
  PAUSED: '#ff9800',
  CANCELLED: '#f44336',
};

export default function PlayerCard({ player, onPress }: PlayerCardProps) {
  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.header}>
        <Text style={styles.name}>{fullName}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColors[player.membershipStatus] || '#999' },
          ]}
        >
          <Text style={styles.statusText}>{player.membershipStatus}</Text>
        </View>
      </View>

      <Text style={styles.email}>{player.email}</Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Membership</Text>
          <Text style={styles.detailValue}>
            {membershipLabels[player.membershipType] || player.membershipType}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Class Credits</Text>
          <Text style={styles.detailValue}>{player.classCredits}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Drop-in Credits</Text>
          <Text style={styles.detailValue}>{player.dropInCredits}</Text>
        </View>
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
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
