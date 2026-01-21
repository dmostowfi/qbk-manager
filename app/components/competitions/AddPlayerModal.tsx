import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Player, TeamRoster } from '../../shared/types';
import { playersApi } from '../../shared/api/services';
import { brand } from '../../constants/branding';

interface AddPlayerModalProps {
  visible: boolean;
  existingRoster: TeamRoster[];
  onClose: () => void;
  onAdd: (playerId: string) => Promise<void>;
}

export default function AddPlayerModal({
  visible,
  existingRoster,
  onClose,
  onAdd,
}: AddPlayerModalProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');

  const existingIds = new Set(existingRoster.map((r) => r.playerId));

  useEffect(() => {
    if (visible) {
      setSearch('');
      setResults([]);
      setError('');
    }
  }, [visible]);

  const handleSearch = async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    setError('');
    try {
      const players = await playersApi.getAll({ search: search.trim() });
      // Filter out players already on roster
      setResults(players.filter((p) => !existingIds.has(p.id)));
    } catch (err) {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (player: Player) => {
    setAdding(player.id);
    setError('');
    try {
      await onAdd(player.id);
      // Remove from results after adding
      setResults((prev) => prev.filter((p) => p.id !== player.id));
    } catch (err: any) {
      setError(err.message || 'Failed to add player');
    } finally {
      setAdding(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Player</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or email..."
              autoFocus
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome name="search" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.resultRow}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.playerEmail}>{item.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAdd(item)}
                    disabled={adding === item.id}
                  >
                    {adding === item.id ? (
                      <ActivityIndicator size="small" color={brand.colors.primary} />
                    ) : (
                      <>
                        <FontAwesome name="plus" size={14} color={brand.colors.primary} />
                        <Text style={styles.addButtonText}>Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.resultsList}
            />
          ) : search && !searching ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No players found</Text>
              <Text style={styles.noResultsHint}>
                Try searching by full name or email address
              </Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: brand.colors.text,
  },
  cancelButton: {
    fontSize: 15,
    color: brand.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: brand.colors.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: brand.colors.text,
  },
  searchButton: {
    backgroundColor: brand.colors.primary,
    width: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.colors.background,
    padding: 14,
    borderRadius: 10,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500',
    color: brand.colors.text,
    marginBottom: 2,
  },
  playerEmail: {
    fontSize: 13,
    color: brand.colors.textLight,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.colors.primary,
    gap: 6,
    minWidth: 70,
    justifyContent: 'center',
  },
  addButtonText: {
    color: brand.colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 15,
    color: brand.colors.textLight,
  },
  noResultsHint: {
    fontSize: 13,
    color: brand.colors.textMuted,
    marginTop: 4,
  },
  error: {
    color: brand.colors.error,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
