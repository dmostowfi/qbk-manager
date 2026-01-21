import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Team, CompetitionFormat } from '../../shared/types';
import { brand } from '../../constants/branding';

interface RosterSectionProps {
  team: Team;
  format: CompetitionFormat;
  isCaptain: boolean;
  isAdmin: boolean;
  onAddPlayer?: () => void;
  onRemovePlayer?: (playerId: string) => void;
}

const formatRequirements: Record<CompetitionFormat, number> = {
  INTERMEDIATE_4S: 4,
  RECREATIONAL_6S: 6,
};

export default function RosterSection({
  team,
  format,
  isCaptain,
  isAdmin,
  onAddPlayer,
  onRemovePlayer,
}: RosterSectionProps) {
  const roster = team.roster || [];
  const requiredPlayers = formatRequirements[format] || 4;
  const currentCount = roster.length;
  const isComplete = currentCount >= requiredPlayers;
  const canModify = isCaptain || isAdmin;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Roster</Text>
          <Text style={[styles.count, isComplete && styles.countComplete]}>
            {currentCount}/{requiredPlayers} players
            {!isComplete && ` (need ${requiredPlayers - currentCount} more)`}
          </Text>
        </View>
        {canModify && onAddPlayer && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPlayer}>
            <FontAwesome name="plus" size={14} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {roster.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No players on roster yet</Text>
          {canModify && (
            <Text style={styles.emptyHint}>Add players to complete your team</Text>
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {roster.map((member) => {
            const player = member.player;
            if (!player) return null;
            const isCaptainPlayer = player.id === team.captainId;
            const name = `${player.firstName} ${player.lastName}`;

            return (
              <View key={member.id} style={styles.playerRow}>
                <View style={styles.playerInfo}>
                  <FontAwesome
                    name={isCaptainPlayer ? 'star' : 'user'}
                    size={16}
                    color={isCaptainPlayer ? brand.colors.secondary : brand.colors.textLight}
                  />
                  <View>
                    <Text style={styles.playerName}>{name}</Text>
                    {isCaptainPlayer && <Text style={styles.captainLabel}>Captain</Text>}
                  </View>
                </View>
                {canModify && !isCaptainPlayer && onRemovePlayer && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemovePlayer(player.id)}
                  >
                    <FontAwesome name="times" size={14} color={brand.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {!isComplete && (
        <View style={styles.warningBox}>
          <FontAwesome name="exclamation-triangle" size={14} color={brand.colors.warning} />
          <Text style={styles.warningText}>
            Team needs {requiredPlayers - currentCount} more player{requiredPlayers - currentCount !== 1 ? 's' : ''} to be complete
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 2,
  },
  count: {
    fontSize: 13,
    color: brand.colors.warning,
    fontWeight: '500',
  },
  countComplete: {
    color: brand.colors.success,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: brand.colors.textLight,
  },
  emptyHint: {
    fontSize: 13,
    color: brand.colors.textMuted,
    marginTop: 4,
  },
  list: {
    gap: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500',
    color: brand.colors.text,
  },
  captainLabel: {
    fontSize: 11,
    color: brand.colors.secondary,
    fontWeight: '600',
    marginTop: 1,
  },
  removeButton: {
    padding: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#F57C00',
    flex: 1,
  },
});
