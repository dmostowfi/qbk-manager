import { View, Text, StyleSheet, FlatList } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Team } from '../../shared/types';
import TeamCard from './TeamCard';
import { brand } from '../../constants/branding';

interface TeamListProps {
  teams: Team[];
  onTeamPress?: (team: Team) => void;
}

export default function TeamList({ teams, onTeamPress }: TeamListProps) {
  if (teams.length === 0) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="users" size={40} color={brand.colors.border} />
        <Text style={styles.emptyText}>No teams registered yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={teams}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TeamCard team={item} onPress={onTeamPress ? () => onTeamPress(item) : undefined} />
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: brand.colors.textLight,
  },
});
