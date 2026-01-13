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
  REGISTERED: '#4caf50',
  WAITLISTED: '#ff9800',
  CANCELLED: '#f44336',
  ATTENDED: '#2196f3',
  NO_SHOW: '#9e9e9e',
};

// Check if a player is eligible to enroll
function getEligibilityError(player: Player, eventType: EventType): string | null {
  const isActive = player.membershipStatus === 'ACTIVE';

  // GOLD + ACTIVE: unlimited everything
  if (player.membershipType === 'GOLD' && isActive) {
    return null;
  }

  // DROP_IN: unlimited open play if active, needs credits for classes
  if (player.membershipType === 'DROP_IN') {
    if (eventType === 'CLASS') {
      return player.classCredits > 0 ? null : 'No class credits';
    }
    if (isActive) {
      return null;
    }
    // Paused/cancelled DROP_IN for OPEN_PLAY needs credits
    return player.dropInCredits > 0 ? null : 'No drop-in credits';
  }

  // Credit-based: NONE, or paused/cancelled memberships
  if (eventType === 'CLASS') {
    return player.classCredits > 0 ? null : 'No class credits';
  }
  if (eventType === 'OPEN_PLAY') {
    return player.dropInCredits > 0 ? null : 'No drop-in credits';
  }

  return null; // Other event types don't require credits
}

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
              <View style={[styles.statusChip, { backgroundColor: '#f44336' }]}>
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
          <View style={[styles.statusChip, { backgroundColor: willBeWaitlisted ? '#ff9800' : '#2196f3' }]}>
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
    const eligibilityError = getEligibilityError(item, eventType);
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
                <ActivityIndicator size="small" color="#1976d2" style={styles.searchLoader} />
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
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  countFull: {
    color: '#f44336',
  },
  unsavedBanner: {
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  unsavedText: {
    color: '#e65100',
    fontSize: 14,
    textAlign: 'center',
  },
  enrollmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  removingRow: {
    opacity: 0.5,
    backgroundColor: '#ffebee',
  },
  pendingRow: {
    backgroundColor: '#e3f2fd',
  },
  enrollmentInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500',
  },
  playerEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  playerCredits: {
    fontSize: 12,
    color: '#888',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: '#f44336',
    fontSize: 13,
  },
  undoButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  undoButtonText: {
    color: '#1976d2',
    fontSize: 13,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
  addSection: {
    marginTop: 12,
  },
  addPlayerButton: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addPlayerButtonText: {
    color: '#1976d2',
    fontSize: 15,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  cancelSearchButton: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelSearchText: {
    color: '#666',
    fontSize: 15,
  },
  searchResults: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    maxHeight: 250,
  },
  searchLoader: {
    padding: 16,
  },
  searchResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ineligibleRow: {
    backgroundColor: '#fafafa',
  },
  searchResultInfo: {
    flex: 1,
  },
  ineligibleText: {
    color: '#999',
  },
  ineligibleChip: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ineligibleChipText: {
    color: '#c62828',
    fontSize: 11,
  },
  addText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsText: {
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  readOnlyText: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
