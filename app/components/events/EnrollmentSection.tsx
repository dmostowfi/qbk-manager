import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Player, Enrollment, EnrollmentStatus, EventType } from '../../shared/types';
import { playersApi } from '../../shared/api/services';
import { getEnrollmentEligibilityError } from '../../shared/utils/eventUtils';
import { brand } from '../../constants/branding';

interface EnrollmentSectionProps {
  enrollments: Enrollment[];
  currentEnrollment: number;
  maxCapacity: number;
  isEditable: boolean;
  eventType: EventType;
  pendingAdds: Record<string, Player>;
  pendingRemoves: Record<string, Enrollment>;
  onAddPending: (player: Player) => void;
  onRemovePending: (enrollment: Enrollment) => void;
  onUndoAdd: (playerId: string) => void;
  onUndoRemove: (enrollmentId: string) => void;
}

const statusColors: Record<EnrollmentStatus, string> = {
  REGISTERED: brand.colors.success,
  WAITLISTED: brand.colors.warning,
  CANCELLED: brand.colors.error,
  ATTENDED: brand.colors.info,
  NO_SHOW: brand.colors.textMuted,
};

export default function EnrollmentSection({
  enrollments,
  currentEnrollment,
  maxCapacity,
  isEditable,
  eventType,
  pendingAdds,
  pendingRemoves,
  onAddPending,
  onRemovePending,
  onUndoAdd,
  onUndoRemove,
}: EnrollmentSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const pendingAddCount = Object.keys(pendingAdds).length;
  const pendingRemoveCount = Object.keys(pendingRemoves).length;
  const displayCount = currentEnrollment + pendingAddCount - pendingRemoveCount;
  const isFull = displayCount >= maxCapacity;

  // Get IDs of players already enrolled or pending
  const enrolledPlayerIds = new Set(enrollments.map((e) => e.playerId));
  const pendingAddPlayerIds = new Set(Object.keys(pendingAdds));

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchPlayers = async () => {
      setSearching(true);
      try {
        const players = await playersApi.getAll({ search: searchQuery });
        // Filter out already enrolled and pending players
        const filtered = players.filter(
          (p) => !enrolledPlayerIds.has(p.id) && !pendingAddPlayerIds.has(p.id)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchPlayers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleAddPlayer = (player: Player) => {
    onAddPending(player);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const renderEnrollment = ({ item }: { item: Enrollment }) => {
    const isBeingRemoved = !!pendingRemoves[item.id];
    const playerName = item.player
      ? `${item.player.firstName} ${item.player.lastName}`
      : 'Unknown Player';

    return (
      <View style={[styles.enrollmentRow, isBeingRemoved && styles.removingRow]}>
        <View style={styles.enrollmentInfo}>
          <Text style={[styles.playerName, isBeingRemoved && styles.removingText]}>
            {playerName}
          </Text>
          <Text style={[styles.playerEmail, isBeingRemoved && styles.removingText]}>
            {item.player?.email}
          </Text>
        </View>

        <View style={styles.enrollmentActions}>
          {isBeingRemoved ? (
            <>
              <View style={[styles.statusChip, { backgroundColor: brand.colors.error }]}>
                <Text style={styles.statusChipText}>REMOVING</Text>
              </View>
              <TouchableOpacity
                style={styles.undoButton}
                onPress={() => onUndoRemove(item.id)}
              >
                <Text style={styles.undoButtonText}>Undo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.statusChip, { backgroundColor: statusColors[item.status] }]}>
                <Text style={styles.statusChipText}>{item.status}</Text>
              </View>
              {isEditable && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemovePending(item)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderPendingAdd = ({ item }: { item: [string, Player] }) => {
    const [playerId, player] = item;
    const willBeWaitlisted = displayCount >= maxCapacity;

    return (
      <View style={[styles.enrollmentRow, styles.pendingRow]}>
        <View style={styles.enrollmentInfo}>
          <Text style={styles.playerName}>
            {player.firstName} {player.lastName}
          </Text>
          <Text style={styles.playerEmail}>{player.email}</Text>
        </View>

        <View style={styles.enrollmentActions}>
          <View style={[styles.statusChip, { backgroundColor: willBeWaitlisted ? brand.colors.warning : brand.colors.info }]}>
            <Text style={styles.statusChipText}>
              {willBeWaitlisted ? 'WILL WAITLIST' : 'PENDING'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={() => onUndoAdd(playerId)}
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSearchResult = ({ item }: { item: Player }) => {
    const eligibilityError = getEnrollmentEligibilityError(item, eventType);
    const isEligible = !eligibilityError;

    return (
      <TouchableOpacity
        style={[styles.searchResultRow, !isEligible && styles.ineligibleRow]}
        onPress={() => isEligible && handleAddPlayer(item)}
        disabled={!isEligible}
      >
        <View style={styles.searchResultInfo}>
          <Text style={[styles.playerName, !isEligible && styles.ineligibleText]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[styles.playerEmail, !isEligible && styles.ineligibleText]}>
            {item.email}
          </Text>
          <Text style={styles.playerCredits}>
            Class: {item.classCredits} | Drop-in: {item.dropInCredits}
          </Text>
        </View>

        {eligibilityError ? (
          <View style={styles.ineligibleChip}>
            <Text style={styles.ineligibleChipText}>{eligibilityError}</Text>
          </View>
        ) : (
          <Text style={styles.addText}>+ Add</Text>
        )}
      </TouchableOpacity>
    );
  };

  const pendingAddEntries = Object.entries(pendingAdds);
  const hasUnsavedChanges = pendingAddCount > 0 || pendingRemoveCount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enrollments</Text>
        <Text style={[styles.countText, isFull && styles.countFull]}>
          {displayCount} / {maxCapacity}
          {isFull && ' (Full)'}
        </Text>
      </View>

      {hasUnsavedChanges && (
        <View style={styles.unsavedBanner}>
          <Text style={styles.unsavedText}>
            Unsaved changes: {pendingAddCount > 0 && `+${pendingAddCount} `}
            {pendingRemoveCount > 0 && `-${pendingRemoveCount}`}
          </Text>
        </View>
      )}

      {/* Current enrollments */}
      {enrollments.length > 0 && (
        <FlatList
          data={enrollments}
          keyExtractor={(item) => item.id}
          renderItem={renderEnrollment}
          scrollEnabled={false}
        />
      )}

      {/* Pending adds */}
      {pendingAddEntries.length > 0 && (
        <FlatList
          data={pendingAddEntries}
          keyExtractor={([id]) => id}
          renderItem={renderPendingAdd}
          scrollEnabled={false}
        />
      )}

      {enrollments.length === 0 && pendingAddEntries.length === 0 && (
        <Text style={styles.emptyText}>No enrollments yet</Text>
      )}

      {/* Add player section */}
      {isEditable && (
        <View style={styles.addSection}>
          {showSearch ? (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by email or phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity
                style={styles.cancelSearchButton}
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Text style={styles.cancelSearchText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPlayerButton}
              onPress={() => setShowSearch(true)}
            >
              <Text style={styles.addPlayerButtonText}>+ Add Player</Text>
            </TouchableOpacity>
          )}

          {/* Search results */}
          {showSearch && (
            <View style={styles.searchResults}>
              {searching ? (
                <ActivityIndicator size="small" color={brand.colors.primary} style={styles.searchLoader} />
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={renderSearchResult}
                  scrollEnabled={false}
                />
              ) : searchQuery.length >= 2 ? (
                <Text style={styles.noResultsText}>No players found</Text>
              ) : null}
            </View>
          )}
        </View>
      )}

      {!isEditable && (
        <Text style={styles.readOnlyText}>
          Enrollment changes are no longer allowed for this event
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countText: {
    fontSize: 13,
    color: brand.colors.textLight,
    fontWeight: '500',
  },
  countFull: {
    color: brand.colors.error,
  },
  unsavedBanner: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  unsavedText: {
    color: '#F57C00',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  enrollmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    marginBottom: 8,
  },
  removingRow: {
    opacity: 0.5,
    backgroundColor: '#FFEBEE',
  },
  pendingRow: {
    backgroundColor: brand.sidebar.activeBackground,
  },
  enrollmentInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500',
    color: brand.colors.text,
  },
  playerEmail: {
    fontSize: 13,
    color: brand.colors.textLight,
    marginTop: 2,
  },
  playerCredits: {
    fontSize: 12,
    color: brand.colors.textMuted,
    marginTop: 2,
  },
  removingText: {
    textDecorationLine: 'line-through',
  },
  enrollmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: brand.colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  undoButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  undoButtonText: {
    color: brand.colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    color: brand.colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  addSection: {
    marginTop: 12,
  },
  addPlayerButton: {
    backgroundColor: brand.colors.surface,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addPlayerButtonText: {
    color: brand.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: brand.colors.surface,
    borderWidth: 0,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  cancelSearchButton: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelSearchText: {
    color: brand.colors.textLight,
    fontSize: 15,
    fontWeight: '500',
  },
  searchResults: {
    marginTop: 10,
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    maxHeight: 250,
    overflow: 'hidden',
  },
  searchLoader: {
    padding: 20,
  },
  searchResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.background,
  },
  ineligibleRow: {
    backgroundColor: brand.colors.background,
  },
  searchResultInfo: {
    flex: 1,
  },
  ineligibleText: {
    color: brand.colors.textMuted,
  },
  ineligibleChip: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  ineligibleChipText: {
    color: brand.colors.error,
    fontSize: 11,
    fontWeight: '500',
  },
  addText: {
    color: brand.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  noResultsText: {
    color: brand.colors.textLight,
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  readOnlyText: {
    color: brand.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
