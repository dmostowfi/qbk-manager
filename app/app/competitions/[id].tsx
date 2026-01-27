import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import dayjs from 'dayjs';
import { useAppAuth } from '../../contexts/AuthContext';
import { useCompetition } from '../../shared/hooks/useCompetition';
import { teamsApi, competitionsApi } from '../../shared/api/services';
import { CompetitionFormData, CompetitionStatus, Team, ScheduleConfig } from '../../shared/types';
import TeamList from '../../components/competitions/TeamList';
import TeamForm from '../../components/competitions/TeamForm';
import TeamDetailModal from '../../components/competitions/TeamDetailModal';
import CompetitionForm from '../../components/competitions/CompetitionForm';
import ScheduleList from '../../components/competitions/ScheduleList';
import StandingsTable from '../../components/competitions/StandingsTable';
import GenerateScheduleModal from '../../components/competitions/GenerateScheduleModal';
import { brand } from '../../constants/branding';

type TabKey = 'teams' | 'schedule' | 'standings';

const tabs: { key: TabKey; label: string; icon: React.ComponentProps<typeof FontAwesome>['name'] }[] = [
  { key: 'teams', label: 'Teams', icon: 'users' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar' },
  { key: 'standings', label: 'Standings', icon: 'list-ol' },
];

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION: 'Registration Open',
  ACTIVE: 'In Progress',
  COMPLETED: 'Completed',
};

const formatLabels: Record<string, string> = {
  INTERMEDIATE_4S: 'Intermediate 4v4',
  RECREATIONAL_6S: 'Recreational 6v6',
};

export default function CompetitionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role, userId } = useAppAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('teams');
  const [refreshing, setRefreshing] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const { competition, teams, matches, standings, loading, error, refetch, refetchTeams } = useCompetition(id);

  const canEdit = role === 'admin' || role === 'staff';
  const isPlayer = role === 'player';
  const isRegistrationOpen = competition?.status === 'REGISTRATION';
  const spotsAvailable = competition ? competition.maxTeams - teams.length : 0;
  const canRegister = isRegistrationOpen && spotsAvailable > 0;

  // Get next valid status transition
  const getNextStatus = (current: CompetitionStatus): { status: CompetitionStatus; label: string } | null => {
    switch (current) {
      case 'DRAFT':
        return { status: 'REGISTRATION', label: 'Open Registration' };
      case 'REGISTRATION':
        return { status: 'ACTIVE', label: 'Start Competition' };
      case 'ACTIVE':
        return { status: 'COMPLETED', label: 'Mark Complete' };
      default:
        return null;
    }
  };

  const nextStatus = competition ? getNextStatus(competition.status) : null;

  const handleUpdateCompetition = async (data: CompetitionFormData) => {
    if (!id) return;
    try {
      await competitionsApi.update(id, data);
      await refetch();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update competition');
      throw err;
    }
  };

  const handleStatusChange = async () => {
    if (!id || !nextStatus) return;

    const confirmMessage = `Are you sure you want to change status to "${statusLabels[nextStatus.status]}"?`;

    // Alert.alert doesn't work on web, use window.confirm instead
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
      try {
        await competitionsApi.updateStatus(id, nextStatus.status);
        await refetch();
      } catch (err: any) {
        window.alert(err.message || 'Could not update status');
      }
    } else {
      Alert.alert(
        nextStatus.label,
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await competitionsApi.updateStatus(id, nextStatus.status);
                await refetch();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Could not update status');
              }
            },
          },
        ]
      );
    }
  };

  const handleRegisterTeam = async (teamName: string) => {
    if (!id) return;
    try {
      await teamsApi.register(id, { name: teamName });
      await refetchTeams();
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not register team');
      throw err;
    }
  };

  const handleGenerateSchedule = async (config: ScheduleConfig) => {
    if (!id) return;
    try {
      await competitionsApi.generateSchedule(id, config);
      await refetch();
    } catch (err: any) {
      Alert.alert('Generation Failed', err.message || 'Could not generate schedule');
      throw err;
    }
  };

  // Can generate schedule if: admin + REGISTRATION status + 2+ teams + no matches yet
  const canGenerateSchedule = canEdit &&
    competition?.status === 'REGISTRATION' &&
    teams.length >= 2 &&
    matches.length === 0;

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading && !competition) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.colors.primary} />
      </View>
    );
  }

  if (error || !competition) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Competition not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const teamCount = teams.length;
  const startDate = dayjs(competition.startDate);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={brand.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>{competition.name}</Text>
          <View style={styles.headerMeta}>
            <View style={[styles.statusBadge, styles[`status_${competition.status}`]]}>
              <Text style={styles.statusText}>{statusLabels[competition.status]}</Text>
            </View>
            <Text style={styles.metaText}>
              {formatLabels[competition.format]} · {competition.type}
            </Text>
          </View>
        </View>
        {canEdit && (
          <TouchableOpacity style={styles.editButton} onPress={() => setShowEditForm(true)}>
            <FontAwesome name="pencil" size={18} color={brand.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <FontAwesome name="calendar" size={14} color={brand.colors.textLight} />
          <Text style={styles.infoText}>{startDate.format('MMM D, YYYY')}</Text>
        </View>
        <View style={styles.infoItem}>
          <FontAwesome name="users" size={14} color={brand.colors.textLight} />
          <Text style={styles.infoText}>{teamCount}/{competition.maxTeams} teams</Text>
        </View>
        <View style={styles.infoItem}>
          <FontAwesome name="dollar" size={14} color={brand.colors.textLight} />
          <Text style={styles.infoText}>${competition.pricePerTeam}/team</Text>
        </View>
      </View>

      {/* Admin Action Bar */}
      {canEdit && nextStatus && (
        <View style={styles.adminBar}>
          <TouchableOpacity style={styles.statusButton} onPress={handleStatusChange}>
            <FontAwesome name="arrow-right" size={14} color="#fff" />
            <Text style={styles.statusButtonText}>{nextStatus.label}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <FontAwesome
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? brand.colors.primary : brand.colors.textLight}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'teams' && (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollContent}
          >
            <TeamList teams={teams} onTeamPress={(team) => setSelectedTeam(team)} />
          </ScrollView>
        )}
        {activeTab === 'schedule' && (
          <ScheduleList
            matches={matches}
            canGenerateSchedule={canGenerateSchedule}
            onGenerateSchedule={() => setShowScheduleModal(true)}
          />
        )}
        {activeTab === 'standings' && (
          <StandingsTable standings={standings} />
        )}
      </View>

      {/* Register Team FAB */}
      {canRegister && activeTab === 'teams' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowTeamForm(true)}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.fabText}>Register Team</Text>
        </TouchableOpacity>
      )}

      {/* Team Registration Modal */}
      {competition && (
        <TeamForm
          visible={showTeamForm}
          competition={competition}
          onClose={() => setShowTeamForm(false)}
          onSubmit={handleRegisterTeam}
        />
      )}

      {/* Edit Competition Modal */}
      <CompetitionForm
        visible={showEditForm}
        competition={competition}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdateCompetition}
      />

      {/* Team Detail Modal */}
      <TeamDetailModal
        visible={!!selectedTeam}
        team={selectedTeam}
        competition={competition}
        currentPlayerId={userId || undefined}
        isAdmin={canEdit}
        onClose={() => setSelectedTeam(null)}
        onUpdate={refetchTeams}
      />

      {/* Generate Schedule Modal */}
      <GenerateScheduleModal
        visible={showScheduleModal}
        competition={competition}
        onClose={() => setShowScheduleModal(false)}
        onSubmit={handleGenerateSchedule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.surface,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  backArrow: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: brand.colors.text,
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  status_DRAFT: { backgroundColor: brand.colors.border },
  status_REGISTRATION: { backgroundColor: '#E8F5E9' },
  status_ACTIVE: { backgroundColor: brand.sidebar.activeBackground },
  status_COMPLETED: { backgroundColor: '#E3F2FD' },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: brand.colors.text,
  },
  metaText: {
    fontSize: 13,
    color: brand.colors.textLight,
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: brand.colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: brand.colors.textLight,
  },
  adminBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: brand.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: brand.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: brand.colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.colors.textLight,
  },
  tabLabelActive: {
    color: brand.colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  errorText: {
    fontSize: 16,
    color: brand.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: brand.colors.primary,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
