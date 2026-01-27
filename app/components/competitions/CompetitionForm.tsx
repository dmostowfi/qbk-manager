import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import {
  Competition,
  CompetitionFormData,
  CompetitionType,
  CompetitionFormat,
} from '../../shared/types';
import { brand } from '../../constants/branding';

interface CompetitionFormProps {
  visible: boolean;
  competition?: Competition | null;
  onClose: () => void;
  onSubmit: (data: CompetitionFormData) => Promise<void>;
}

const competitionTypes: { value: CompetitionType; label: string }[] = [
  { value: 'LEAGUE', label: 'League' },
  { value: 'TOURNAMENT', label: 'Tournament' },
];

const competitionFormats: { value: CompetitionFormat; label: string }[] = [
  { value: 'INTERMEDIATE_4S', label: 'Intermediate 4v4' },
  { value: 'RECREATIONAL_6S', label: 'Recreational 6v6' },
];

export default function CompetitionForm({
  visible,
  competition,
  onClose,
  onSubmit,
}: CompetitionFormProps) {
  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<CompetitionType>('LEAGUE');
  const [format, setFormat] = useState<CompetitionFormat>('INTERMEDIATE_4S');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [pricePerTeam, setPricePerTeam] = useState('200');
  const [maxTeams, setMaxTeams] = useState('8');
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(undefined);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date picker visibility
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const isEditing = !!competition;

  useEffect(() => {
    if (competition) {
      setName(competition.name);
      setType(competition.type);
      setFormat(competition.format);
      setStartDate(new Date(competition.startDate));
      setEndDate(competition.endDate ? new Date(competition.endDate) : undefined);
      setPricePerTeam(String(competition.pricePerTeam));
      setMaxTeams(String(competition.maxTeams));
      setRegistrationDeadline(
        competition.registrationDeadline ? new Date(competition.registrationDeadline) : undefined
      );
    } else {
      // Reset form for new competition
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      setName('');
      setType('LEAGUE');
      setFormat('INTERMEDIATE_4S');
      setStartDate(nextWeek);
      setEndDate(undefined);
      setPricePerTeam('200');
      setMaxTeams('8');
      setRegistrationDeadline(undefined);
    }
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setShowDeadlinePicker(false);
    setError('');
  }, [competition, visible]);

  // Date picker handlers
  const handleStartDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleDeadlineChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDeadlinePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRegistrationDeadline(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const price = parseInt(pricePerTeam, 10);
    if (isNaN(price) || price <= 0) {
      setError('Price must be a positive number');
      return;
    }

    const teams = parseInt(maxTeams, 10);
    if (isNaN(teams) || teams < 2) {
      setError('Must have at least 2 teams');
      return;
    }

    if (endDate && endDate < startDate) {
      setError('End date must be after start date');
      return;
    }

    // For leagues, ensure end date is same day of week as start date
    if (type === 'LEAGUE' && endDate && endDate.getDay() !== startDate.getDay()) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setError(`End date must be a ${days[startDate.getDay()]} (same day as start date)`);
      return;
    }

    if (registrationDeadline && registrationDeadline > startDate) {
      setError('Registration deadline must be before start date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData: CompetitionFormData = {
        name: name.trim(),
        type,
        format,
        startDate,
        endDate,
        pricePerTeam: price,
        maxTeams: teams,
        registrationDeadline,
      };

      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save competition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Competition' : 'New Competition'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={brand.colors.primary} />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContentContainer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Spring 2025 Intermediate League"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={type}
              onValueChange={(value) => setType(value)}
              style={styles.picker}
            >
              {competitionTypes.map((t) => (
                <Picker.Item key={t.value} label={t.label} value={t.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Format</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={format}
              onValueChange={(value) => setFormat(value)}
              style={styles.picker}
            >
              {competitionFormats.map((f) => (
                <Picker.Item key={f.value} label={f.label} value={f.value} />
              ))}
            </Picker>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Price per Team ($)</Text>
              <TextInput
                style={styles.input}
                value={pricePerTeam}
                onChangeText={setPricePerTeam}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Max Teams</Text>
              <TextInput
                style={styles.input}
                value={maxTeams}
                onChangeText={setMaxTeams}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Start Date *</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newDate = new Date(startDate);
                  newDate.setFullYear(year, month - 1, day);
                  setStartDate(newDate);
                }
              }}
              style={webInputStyle}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateTimeText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                />
              )}
            </>
          )}

          <Text style={styles.label}>End Date (Optional)</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newDate = new Date();
                  newDate.setFullYear(year, month - 1, day);
                  setEndDate(newDate);
                } else {
                  setEndDate(undefined);
                }
              }}
              style={webInputStyle}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={[styles.dateTimeText, !endDate && styles.placeholderText]}>
                  {endDate ? formatDate(endDate) : 'Select end date'}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                />
              )}
            </>
          )}

          <Text style={styles.label}>Registration Deadline (Optional)</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={registrationDeadline ? registrationDeadline.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newDate = new Date();
                  newDate.setFullYear(year, month - 1, day);
                  setRegistrationDeadline(newDate);
                } else {
                  setRegistrationDeadline(undefined);
                }
              }}
              style={webInputStyle}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDeadlinePicker(true)}
              >
                <Text style={[styles.dateTimeText, !registrationDeadline && styles.placeholderText]}>
                  {registrationDeadline ? formatDate(registrationDeadline) : 'Select deadline'}
                </Text>
              </TouchableOpacity>
              {showDeadlinePicker && (
                <DateTimePicker
                  value={registrationDeadline || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDeadlineChange}
                />
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const webInputStyle = {
  padding: 14,
  fontSize: 15,
  border: 'none',
  borderRadius: 10,
  marginBottom: 20,
  backgroundColor: brand.colors.surface,
  color: brand.colors.text,
  width: '100%',
  boxSizing: 'border-box' as const,
  outline: 'none',
};

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
    letterSpacing: -0.3,
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
  formContentContainer: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
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
    borderWidth: 0,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    color: brand.colors.text,
  },
  pickerContainer: {
    backgroundColor: brand.colors.surface,
    borderWidth: 0,
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    backgroundColor: 'transparent',
    border: 'none',
    borderWidth: 0,
    fontSize: 15,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: brand.colors.text,
    paddingHorizontal: 14,
    outline: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    width: '100%',
    cursor: 'pointer',
  } as any,
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  dateTimeButton: {
    backgroundColor: brand.colors.surface,
    borderWidth: 0,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  dateTimeText: {
    fontSize: 15,
    color: brand.colors.text,
  },
  placeholderText: {
    color: brand.colors.textMuted,
  },
  error: {
    color: brand.colors.error,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
