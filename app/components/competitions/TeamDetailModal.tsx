import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Team, Competition, CompetitionFormat, Player } from '../../shared/types';
import { teamsApi } from '../../shared/api/services';
import { getRosterEligibilityError } from '../../shared/utils/competitionUtils';
import { brand } from '../../constants/branding';

interface TeamDetailModalProps {
  visible: boolean;
  team: Team | null;
  competition: Competition;
  currentPlayerId?: string;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const formatRequirements: Record<CompetitionFormat, number> = {
  INTERMEDIATE_4S: 4,
  RECREATIONAL_6S: 6,
};

export default function TeamDetailModal({
  visible,
  team,
  competition,
  currentPlayerId,
  isAdmin,
  onClose,
  onUpdate,
}: TeamDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamData, setTeamData] = useState<Team | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  // Pending changes (not yet saved)
  const [pendingAdds, setPendingAdds] = useState<Record<string, Player>>({});
  const [pendingRemoves, setPendingRemoves] = useState<Record<string, string>>({});

  const isCaptain = currentPlayerId && team?.captainId === currentPlayerId;
  const canModifyRoster = isAdmin || isCaptain;

  const pendingAddCount = Object.keys(pendingAdds).length;
  const pendingRemoveCount = Object.keys(pendingRemoves).length;
  const hasUnsavedChanges = pendingAddCount > 0 || pendingRemoveCount > 0;

  useEffect(() => {
    if (visible && team) {
      fetchTeamDetails();
      // Reset all state when modal opens
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      setPendingAdds({});
      setPendingRemoves({});
    }
  }, [visible, team?.id]);

  // Debounced search
  useEffect(() => {
    if (!showSearch || searchQuery.length < 2 || !team) {
      setSearchResults([]);
      return;
    }

    const searchPlayers = async () => {
      setSearching(true);
      setError('');
      try {
        const players = await teamsApi.searchPlayersForRoster(competition.id, team.id, searchQuery.trim());
        // Also filter out players already in pendingAdds
        const pendingAddIds = new Set(Object.keys(pendingAdds));
        setSearchResults(players.filter((p) => !pendingAddIds.has(p.id)));
      } catch (err) {
        setError('Search failed');
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchPlayers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, showSearch, competition.id, team?.id, pendingAdds]);

  const fetchTeamDetails = async () => {
    if (!team) return;
    setLoading(true);
    try {
      const data = await teamsApi.getById(competition.id, team.id);
      setTeamData(data);
    } catch (err) {
      console.error('Failed to fetch team details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add to pending (not saved yet)
  const handleAddPending = (player: Player) => {
    setPendingAdds((prev) => ({ ...prev, [player.id]: player }));
    // Remove from search results
    setSearchResults((prev) => prev.filter((p) => p.id !== player.id));
  };

  // Undo pending add
  const handleUndoAdd = (playerId: string) => {
    setPendingAdds((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  };

  // Mark for removal (not saved yet)
  const handleRemovePending = (playerId: string) => {
    setPendingRemoves((prev) => ({ ...prev, [playerId]: playerId }));
  };

  // Undo pending removal
  const handleUndoRemove = (playerId: string) => {
    setPendingRemoves((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  };

  // Save all changes
  const handleSave = async () => {
    if (!team || !hasUnsavedChanges) return;

    setSaving(true);
    setError('');

    try {
      // Process removals first
      for (const playerId of Object.keys(pendingRemoves)) {
        await teamsApi.removeFromRoster(competition.id, team.id, playerId);
      }

      // Then process adds
      for (const playerId of Object.keys(pendingAdds)) {
        await teamsApi.addToRoster(competition.id, team.id, playerId);
      }

      // Clear pending state
      setPendingAdds({});
      setPendingRemoves({});
      setShowSearch(false);
      setSearchQuery('');

      // Refresh data
      await fetchTeamDetails();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmMessage = 'You have unsaved changes. Discard them?';
      if (Platform.OS === 'web') {
        if (!window.confirm(confirmMessage)) return;
      } else {
        Alert.alert('Unsaved Changes', confirmMessage, [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]);
        return;
      }
    }
    onClose();
  };

  if (!team) return null;

  const displayTeam = teamData || team;
  const roster = displayTeam.roster || [];
  const requiredPlayers = formatRequirements[competition.format] || 4;
  const currentCount = roster.length - pendingRemoveCount + pendingAddCount;
  const isRosterComplete = currentCount >= requiredPlayers;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{displayTeam.name}</Text>
          {canModifyRoster ? (
            <TouchableOpacity
              onPress={handleSave}
              disabled={!hasUnsavedChanges || saving}
              style={[styles.saveButton, (!hasUnsavedChanges || saving) && styles.saveButtonDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={brand.colors.primary} />
              ) : (
                <Text style={[styles.saveButtonText, !hasUnsavedChanges && styles.saveButtonTextDisabled]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading && !teamData ? (
            <ActivityIndicator size="large" color={brand.colors.primary} />
          ) : (
            <>
              {/* Team Status */}
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, displayTeam.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusPending]}>
                  <Text style={styles.statusText}>
                    {displayTeam.status === 'CONFIRMED' ? 'Confirmed' : 'Pending Payment'}
                  </Text>
                </View>
                {displayTeam.paidInFull && (
                  <View style={styles.paidBadge}>
                    <FontAwesome name="check" size={12} color="#fff" />
                    <Text style={styles.paidText}>Paid</Text>
                  </View>
                )}
              </View>

              {/* Roster Section */}
              <View style={styles.rosterContainer}>
                <View style={styles.rosterHeader}>
                  <Text style={styles.rosterTitle}>Roster</Text>
                  <Text style={[styles.rosterCount, isRosterComplete && styles.rosterCountComplete]}>
                    {currentCount}/{requiredPlayers} players
                    {!isRosterComplete && ` (need ${requiredPlayers - currentCount} more)`}
                  </Text>
                </View>

                {/* Unsaved Changes Banner */}
                {hasUnsavedChanges && (
                  <View style={styles.unsavedBanner}>
                    <Text style={styles.unsavedText}>
                      Unsaved changes: {pendingAddCount > 0 && `+${pendingAddCount} `}
                      {pendingRemoveCount > 0 && `-${pendingRemoveCount}`}
                    </Text>
                  </View>
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {/* Current Roster */}
                {roster.length === 0 && pendingAddCount === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No players on roster yet</Text>
                    {canModifyRoster && (
                      <Text style={styles.emptyHint}>Add players to complete your team</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.rosterList}>
                    {/* Existing roster members */}
                    {roster.map((member) => {
                      const player = member.player;
                      if (!player) return null;
                      const isCaptainPlayer = player.id === displayTeam.captainId;
                      const isBeingRemoved = !!pendingRemoves[player.id];
                      const name = `${player.firstName} ${player.lastName}`;

                      return (
                        <View key={member.id} style={[styles.playerRow, isBeingRemoved && styles.removingRow]}>
                          <View style={styles.playerInfo}>
                            <FontAwesome
                              name={isCaptainPlayer ? 'star' : 'user'}
                              size={16}
                              color={isCaptainPlayer ? brand.colors.secondary : brand.colors.textLight}
                            />
                            <View>
                              <Text style={[styles.playerName, isBeingRemoved && styles.removingText]}>
                                {name}
                              </Text>
                              {isCaptainPlayer && <Text style={styles.captainLabel}>Captain</Text>}
                            </View>
                          </View>

                          <View style={styles.playerActions}>
                            {isBeingRemoved ? (
                              <>
                                <View style={[styles.statusChip, styles.statusChipRemoving]}>
                                  <Text style={styles.statusChipText}>REMOVING</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleUndoRemove(player.id)}>
                                  <Text style={styles.undoText}>Undo</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              canModifyRoster && !isCaptainPlayer && (
                                <TouchableOpacity onPress={() => handleRemovePending(player.id)}>
                                  <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                              )
                            )}
                          </View>
                        </View>
                      );
                    })}

                    {/* Pending adds */}
                    {Object.entries(pendingAdds).map(([playerId, player]) => (
                      <View key={playerId} style={[styles.playerRow, styles.pendingRow]}>
                        <View style={styles.playerInfo}>
                          <FontAwesome name="user" size={16} color={brand.colors.textLight} />
                          <View>
                            <Text style={styles.playerName}>
                              {player.firstName} {player.lastName}
                            </Text>
                            <Text style={styles.playerEmail}>{player.email}</Text>
                          </View>
                        </View>

                        <View style={styles.playerActions}>
                          <View style={[styles.statusChip, styles.statusChipPending]}>
                            <Text style={styles.statusChipText}>PENDING</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleUndoAdd(playerId)}>
                            <Text style={styles.undoText}>Undo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Incomplete Roster Warning */}
                {!isRosterComplete && !hasUnsavedChanges && (
                  <View style={styles.warningBox}>
                    <FontAwesome name="exclamation-triangle" size={14} color={brand.colors.warning} />
                    <Text style={styles.warningText}>
                      Team needs {requiredPlayers - currentCount} more player{requiredPlayers - currentCount !== 1 ? 's' : ''} to be complete
                    </Text>
                  </View>
                )}

                {/* Add Player Section - Inline Search */}
                {canModifyRoster && (
                  <View style={styles.addSection}>
                    {showSearch ? (
                      <View style={styles.searchContainer}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoCapitalize="none"
                          autoFocus
                        />
                        <TouchableOpacity style={styles.cancelSearchButton} onPress={handleCancelSearch}>
                          <Text style={styles.cancelSearchText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addPlayerButton} onPress={() => setShowSearch(true)}>
                        <Text style={styles.addPlayerButtonText}>+ Add Player</Text>
                      </TouchableOpacity>
                    )}

                    {/* Search Results */}
                    {showSearch && (
                      <View style={styles.searchResults}>
                        {searching ? (
                          <ActivityIndicator size="small" color={brand.colors.primary} style={styles.searchLoader} />
                        ) : searchResults.length > 0 ? (
                          searchResults.map((player) => {
                            const eligibilityError = getRosterEligibilityError(player);
                            const isEligible = !eligibilityError;

                            return (
                              <TouchableOpacity
                                key={player.id}
                                style={[styles.searchResultRow, !isEligible && styles.ineligibleRow]}
                                onPress={() => isEligible && handleAddPending(player)}
                                disabled={!isEligible}
                              >
                                <View style={styles.searchResultInfo}>
                                  <Text style={[styles.searchResultName, !isEligible && styles.ineligibleText]}>
                                    {player.firstName} {player.lastName}
                                  </Text>
                                  <Text style={[styles.searchResultEmail, !isEligible && styles.ineligibleText]}>
                                    {player.email}
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
                          })
                        ) : searchQuery.length >= 2 ? (
                          <Text style={styles.noResultsText}>No players found</Text>
                        ) : searchQuery.length > 0 ? (
                          <Text style={styles.hintText}>Type at least 2 characters</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: brand.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: brand.colors.text,
  },
  closeButton: {
    fontSize: 15,
    color: brand.colors.textLight,
    fontWeight: '500',
  },
  saveButton: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    color: brand.colors.primary,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: brand.colors.textMuted,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#FFF8E1',
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.colors.text,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  paidText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Roster styles
  rosterContainer: {
    backgroundColor: brand.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rosterHeader: {
    marginBottom: 16,
  },
  rosterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 2,
  },
  rosterCount: {
    fontSize: 13,
    color: brand.colors.warning,
    fontWeight: '500',
  },
  rosterCountComplete: {
    color: brand.colors.success,
  },
  unsavedBanner: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  unsavedText: {
    color: '#F57C00',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  error: {
    color: brand.colors.error,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
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
  rosterList: {
    gap: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  removingRow: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pendingRow: {
    backgroundColor: brand.sidebar.activeBackground,
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500',
    color: brand.colors.text,
  },
  removingText: {
    textDecorationLine: 'line-through',
    color: brand.colors.textMuted,
  },
  playerEmail: {
    fontSize: 12,
    color: brand.colors.textLight,
    marginTop: 1,
  },
  captainLabel: {
    fontSize: 11,
    color: brand.colors.secondary,
    fontWeight: '600',
    marginTop: 1,
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusChipPending: {
    backgroundColor: brand.colors.info,
  },
  statusChipRemoving: {
    backgroundColor: brand.colors.error,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  undoText: {
    color: brand.colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  removeText: {
    color: brand.colors.error,
    fontSize: 13,
    fontWeight: '500',
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
  // Add player section
  addSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: brand.colors.border,
    paddingTop: 16,
  },
  addPlayerButton: {
    backgroundColor: brand.colors.background,
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
    backgroundColor: brand.colors.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: brand.colors.text,
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
    backgroundColor: brand.colors.background,
    borderRadius: 10,
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
    borderBottomColor: brand.colors.surface,
  },
  ineligibleRow: {
    opacity: 0.5,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
    color: brand.colors.text,
  },
  searchResultEmail: {
    fontSize: 13,
    color: brand.colors.textLight,
    marginTop: 2,
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
  hintText: {
    color: brand.colors.textMuted,
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
});
