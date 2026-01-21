import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, router } from 'expo-router';
import { useAppAuth } from '../../contexts/AuthContext';
import { useCompetitions } from '../../shared/hooks/useCompetitions';
import { Competition, CompetitionFormData, CompetitionStatus } from '../../shared/types';
import CompetitionCard from '../../components/competitions/CompetitionCard';
import CompetitionForm from '../../components/competitions/CompetitionForm';
import { brand } from '../../constants/branding';

type StatusFilter = 'all' | CompetitionStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'REGISTRATION', label: 'Open' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Past' },
];

export default function CompetitionsScreen() {
  const { role } = useAppAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filterParams = statusFilter === 'all' ? {} : { status: statusFilter };
  const { competitions, loading, error, refetch, createCompetition, updateCompetition } =
    useCompetitions(filterParams);

  const canEdit = role === 'admin' || role === 'staff';

  // Refetch when tab gains focus
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

  const handleCreate = async (data: CompetitionFormData) => {
    try {
      await createCompetition(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create competition');
      throw err;
    }
  };

  const handleUpdate = async (data: CompetitionFormData) => {
    if (!editingCompetition) return;
    try {
      await updateCompetition(editingCompetition.id, data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update competition');
      throw err;
    }
  };

  const handleCompetitionPress = (competition: Competition) => {
    // Navigate to detail screen
    router.push(`/competitions/${competition.id}`);
  };

  const handleAddCompetition = () => {
    setEditingCompetition(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCompetition(null);
  };

  const renderCompetition = ({ item }: { item: Competition }) => (
    <CompetitionCard competition={item} onPress={() => handleCompetitionPress(item)} />
  );

  if (loading && !refreshing && competitions.length === 0) {
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
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[styles.filterButton, statusFilter === filter.value && styles.filterButtonActive]}
            onPress={() => setStatusFilter(filter.value)}
          >
            <Text
              style={[styles.filterText, statusFilter === filter.value && styles.filterTextActive]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Header Actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {competitions.length} Competition{competitions.length !== 1 ? 's' : ''}
        </Text>

        {canEdit && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddCompetition}>
            <FontAwesome name="plus" size={16} color="#fff" />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={competitions}
        keyExtractor={(item) => item.id}
        renderItem={renderCompetition}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FontAwesome name="trophy" size={48} color={brand.colors.border} />
            <Text style={styles.emptyText}>
              {statusFilter === 'all'
                ? 'No competitions yet'
                : `No ${statusFilters.find((f) => f.value === statusFilter)?.label.toLowerCase()} competitions`}
            </Text>
            {canEdit && statusFilter === 'all' && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddCompetition}>
                <Text style={styles.emptyButtonText}>Create Competition</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Competition Form Modal */}
      <CompetitionForm
        visible={showForm}
        competition={editingCompetition}
        onClose={handleCloseForm}
        onSubmit={editingCompetition ? handleUpdate : handleCreate}
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: brand.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: brand.colors.background,
  },
  filterButtonActive: {
    backgroundColor: brand.colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.colors.textLight,
  },
  filterTextActive: {
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: brand.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  headerTitle: {
    fontSize: 14,
    color: brand.colors.textLight,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: brand.colors.primary,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: brand.colors.textLight,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: brand.colors.primary,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  errorText: {
    fontSize: 16,
    color: brand.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: brand.colors.primary,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});
