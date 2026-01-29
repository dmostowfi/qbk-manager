import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Competition } from '../../shared/types';
import { brand } from '../../constants/branding';

interface GenerateScheduleModalProps {
  visible: boolean;
  competition: Competition | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function GenerateScheduleModal({
  visible,
  competition,
  onClose,
  onSubmit,
}: GenerateScheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Derive values from competition
  const startDate = competition ? new Date(competition.startDate) : new Date();
  const dayOfWeek = startDate.getDay();
  const dayName = daysOfWeek[dayOfWeek];
  const numberOfWeeks = competition?.numberOfWeeks;
  const assignedSpaces = competition?.spaces;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await onSubmit();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate Schedule</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={brand.colors.primary} />
            ) : (
              <Text style={styles.saveButton}>Generate</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              This will create a round-robin schedule where each team plays every other team.
              Courts will be automatically assigned based on calendar availability.
            </Text>
          </View>

          {/* Derived from competition - read only */}
          <Text style={styles.label}>Start Date</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{formatDate(startDate)}</Text>
          </View>

          <Text style={styles.label}>Game Day</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{dayName}s</Text>
          </View>

          {numberOfWeeks && (
            <>
              <Text style={styles.label}>Number of Weeks</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{numberOfWeeks} weeks</Text>
              </View>
            </>
          )}

          {assignedSpaces && assignedSpaces.length > 0 && (
            <>
              <Text style={styles.label}>Assigned Courts</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {assignedSpaces.map((s) => `Court ${s.name}`).join(', ')}
                </Text>
              </View>
            </>
          )}

          {(!assignedSpaces || assignedSpaces.length === 0) && (
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlySubtext}>
                All available courts will be used automatically
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
    color: brand.colors.textLight,
    fontWeight: '500',
  },
  saveButton: {
    fontSize: 15,
    color: brand.colors.primary,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  formContent: {
    padding: 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  infoBox: {
    backgroundColor: brand.sidebar.activeBackground,
    padding: 14,
    borderRadius: 10,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: brand.colors.text,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: brand.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    color: brand.colors.text,
  },
  readOnlyField: {
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    opacity: 0.8,
  },
  readOnlyText: {
    fontSize: 15,
    color: brand.colors.text,
  },
  readOnlySubtext: {
    fontSize: 12,
    color: brand.colors.textMuted,
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    color: brand.colors.textMuted,
    marginTop: -12,
  },
  error: {
    color: brand.colors.error,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
