import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { usePlayers } from '../../shared/hooks/usePlayers';
import { Player } from '../../shared/types';
import { PlayerFormData } from '../../shared/api/services';
import PlayerForm from '../../components/players/PlayerForm';
import { brand } from '../../constants/branding';

const membershipColors: Record<string, { bg: string; text: string }> = {
  GOLD: { bg: '#fff3e0', text: '#e65100' },
  DROP_IN: { bg: '#e3f2fd', text: '#1565c0' },
  NONE: { bg: '#f5f5f5', text: '#666' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#e8f5e9', text: '#2e7d32' },
  PAUSED: { bg: '#fff3e0', text: '#ef6c00' },
  CANCELLED: { bg: '#ffebee', text: '#c62828' },
};

export default function PlayersScreen() {
  const { players, loading, error, refetch, setFilters, updatePlayer } = usePlayers();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Refetch players when tab gains focus (but not during search)
  useFocusEffect(
    useCallback(() => {
      if (!searchQuery) {
        refetch();
      }
    }, [refetch, searchQuery])
  );

  // Debounced search
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setFilters({ search: searchQuery });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, setFilters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePlayerPress = (player: Player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const handleUpdatePlayer = async (data: Partial<PlayerFormData>) => {
    if (!editingPlayer) return;
    await updatePlayer(editingPlayer.id, data);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPlayer(null);
    refetch();
  };

  if (loading && !refreshing && players.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.colors.primary} />
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
      <ScrollView
        style={styles.tableContainer}
        contentContainerStyle={styles.tableContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.tableWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by email or phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
              <Text style={[styles.headerCell, styles.emailColumn]}>Email</Text>
              <Text style={[styles.headerCell, styles.phoneColumn]}>Phone</Text>
              <Text style={[styles.headerCell, styles.membershipColumn]}>Membership</Text>
              <Text style={[styles.headerCell, styles.statusColumn]}>Status</Text>
              <Text style={[styles.headerCell, styles.creditsColumn]}>Class Credits</Text>
              <Text style={[styles.headerCell, styles.creditsColumn]}>Drop-in Credits</Text>
            </View>

            {/* Table Rows */}
            {players.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No players found</Text>
              </View>
            ) : (
              players.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.tableRow}
                  onPress={() => handlePlayerPress(player)}
                >
                  <Text style={[styles.cell, styles.nameColumn]} numberOfLines={1}>
                    {player.firstName} {player.lastName}
                  </Text>
                  <Text style={[styles.cell, styles.emailColumn]} numberOfLines={1}>
                    {player.email}
                  </Text>
                  <Text style={[styles.cell, styles.phoneColumn]} numberOfLines={1}>
                    {player.phone || '-'}
                  </Text>
                  <View style={[styles.cell, styles.membershipColumn]}>
                    <View style={[
                      styles.chip,
                      { backgroundColor: membershipColors[player.membershipType]?.bg || '#f5f5f5' }
                    ]}>
                      <Text style={[
                        styles.chipText,
                        { color: membershipColors[player.membershipType]?.text || '#666' }
                      ]}>
                        {player.membershipType}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.cell, styles.statusColumn]}>
                    <View style={[
                      styles.chip,
                      styles.chipOutlined,
                      { borderColor: statusColors[player.membershipStatus]?.text || '#666' }
                    ]}>
                      <Text style={[
                        styles.chipText,
                        { color: statusColors[player.membershipStatus]?.text || '#666' }
                      ]}>
                        {player.membershipStatus}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cell, styles.creditsColumn, styles.creditsText]}>
                    {player.classCredits}
                  </Text>
                  <Text style={[styles.cell, styles.creditsColumn, styles.creditsText]}>
                    {player.dropInCredits}
                  </Text>
                </TouchableOpacity>
              ))
            )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <PlayerForm
        visible={showForm}
        player={editingPlayer}
        onClose={handleCloseForm}
        onSubmit={handleUpdatePlayer}
      />
    </View>
  );
}

// Total table width = sum of all column widths + padding
const TABLE_WIDTH = 180 + 220 + 130 + 110 + 110 + 100 + 110; // ~960px

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableContainer: {
    flex: 1,
  },
  tableContentContainer: {
    padding: 16,
    maxWidth: brand.content.maxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  tableWrapper: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchContainer: {
    width: TABLE_WIDTH,
    padding: 16,
    backgroundColor: brand.colors.surface,
  },
  searchInput: {
    backgroundColor: brand.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: brand.colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: brand.colors.background,
    borderBottomWidth: 2,
    borderBottomColor: brand.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: TABLE_WIDTH,
  },
  headerCell: {
    fontWeight: '600',
    fontSize: 14,
    color: brand.colors.text,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: TABLE_WIDTH,
  },
  cell: {
    fontSize: 14,
    color: brand.colors.text,
    paddingHorizontal: 8,
  },
  nameColumn: {
    width: 180,
  },
  emailColumn: {
    width: 220,
  },
  phoneColumn: {
    width: 130,
  },
  membershipColumn: {
    width: 110,
  },
  statusColumn: {
    width: 110,
  },
  creditsColumn: {
    width: 100,
  },
  creditsText: {
    textAlign: 'right',
    fontWeight: '500',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  chipOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyRow: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: brand.colors.textLight,
  },
  errorText: {
    fontSize: 16,
    color: brand.colors.error,
    textAlign: 'center',
    padding: 20,
  },
});
