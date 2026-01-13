import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { usePlayers } from '../../shared/hooks/usePlayers';
import { Player } from '../../shared/types';
import { PlayerFormData } from '../../shared/api/services';
import PlayerCard from '../../components/players/PlayerCard';
import PlayerForm from '../../components/players/PlayerForm';

export default function PlayersScreen() {
  const { players, loading, error, refetch, setFilters, updatePlayer } = usePlayers();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setFilters({ search: text });
  };

  const handlePlayerPress = (player: Player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const handleUpdatePlayer = async (data: Partial<PlayerFormData>) => {
    if (!editingPlayer) return;
    await updatePlayer(editingPlayer.id, data);
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <PlayerCard player={item} onPress={() => handlePlayerPress(item)} />
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

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search players..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={players}
        keyExtractor={(item) => item.id}
        renderItem={renderPlayer}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No players found</Text>
          </View>
        }
      />

      <PlayerForm
        visible={showForm}
        player={editingPlayer}
        onClose={() => {
          setShowForm(false);
          setEditingPlayer(null);
        }}
        onSubmit={handleUpdatePlayer}
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
  searchContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
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
