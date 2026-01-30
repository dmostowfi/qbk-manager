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
  Space,
} from '../../shared/types';
import { spacesApi } from '../../shared/api/services';
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
  const [numberOfWeeks, setNumberOfWeeks] = useState<string>('8');
  const [pricePerTeam, setPricePerTeam] = useState('200');
  const [deposit, setDeposit] = useState('50');
  const [earlyBirdDiscount, setEarlyBirdDiscount] = useState('0');
  const [earlyBirdDeadline, setEarlyBirdDeadline] = useState<Date>(new Date());
  const [depositDeadline, setDepositDeadline] = useState<Date>(new Date());
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(undefined);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courts, setCourts] = useState<Space[]>([]);

  // Date picker visibility
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showEarlyBirdDeadlinePicker, setShowEarlyBirdDeadlinePicker] = useState(false);
  const [showDepositDeadlinePicker, setShowDepositDeadlinePicker] = useState(false);

  const isEditing = !!competition;

  // Fetch available courts
  useEffect(() => {
    spacesApi.list('COURT').then(setCourts).catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (competition) {
      setName(competition.name);
      setType(competition.type);
      setFormat(competition.format);
      setStartDate(new Date(competition.startDate));
      setNumberOfWeeks(competition.numberOfWeeks ? String(competition.numberOfWeeks) : '8');
      setPricePerTeam(String(competition.pricePerTeam));
      setDeposit(String(competition.deposit));
      setEarlyBirdDiscount(String(competition.earlyBirdDiscount));
      setEarlyBirdDeadline(new Date(competition.earlyBirdDeadline));
      setDepositDeadline(new Date(competition.depositDeadline));
      setSelectedSpaceIds(competition.spaces?.map((s: Space) => s.id) || []);
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
      setNumberOfWeeks('8');
      setPricePerTeam('200');
      setDeposit('50');
      setEarlyBirdDiscount('0');
      setEarlyBirdDeadline(new Date());
      setDepositDeadline(new Date());
      setSelectedSpaceIds([]);
      setRegistrationDeadline(undefined);
    }
    setShowStartDatePicker(false);
    setShowDeadlinePicker(false);
    setShowEarlyBirdDeadlinePicker(false);
    setShowDepositDeadlinePicker(false);
    setError('');
  }, [competition, visible]);

  // Date picker handlers
  const handleStartDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleDeadlineChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDeadlinePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRegistrationDeadline(selectedDate);
    }
  };

  const handleEarlyBirdDeadlineChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEarlyBirdDeadlinePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEarlyBirdDeadline(selectedDate);
    }
  };

  const handleDepositDeadlineChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDepositDeadlinePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDepositDeadline(selectedDate);
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

    if (type === 'LEAGUE') {
      const weeks = parseInt(numberOfWeeks, 10);
      if (isNaN(weeks) || weeks <= 0) {
        setError('Number of weeks must be a positive number');
        return;
      }
    }

    const depositValue = parseInt(deposit, 10);
    if (isNaN(depositValue) || depositValue < 0) {
      setError('Deposit must be 0 or a positive number');
      return;
    }

    const earlyBirdValue = parseInt(earlyBirdDiscount, 10);
    if (isNaN(earlyBirdValue) || earlyBirdValue < 0) {
      setError('Early bird discount must be 0 or a positive number');
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
        ...(type === 'LEAGUE' ? { numberOfWeeks: parseInt(numberOfWeeks, 10) } : {}),
        pricePerTeam: price,
        deposit: depositValue,
        earlyBirdDiscount: earlyBirdValue,
        earlyBirdDeadline,
        depositDeadline,
        registrationDeadline,
        ...(selectedSpaceIds.length > 0 ? { spaceIds: selectedSpaceIds } : {}),
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

          {courts.length > 0 && (
            <>
              <Text style={styles.label}>Courts (Optional — default: all courts)</Text>
              <View style={styles.courtSelector}>
                {courts.map((court) => {
                  const selected = selectedSpaceIds.includes(court.id);
                  return (
                    <TouchableOpacity
                      key={court.id}
                      style={[styles.courtChip, selected && styles.courtChipSelected]}
                      onPress={() => {
                        setSelectedSpaceIds((prev) =>
                          selected
                            ? prev.filter((id) => id !== court.id)
                            : [...prev, court.id]
                        );
                      }}
                    >
                      <Text style={[styles.courtChipText, selected && styles.courtChipTextSelected]}>
                        {court.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.label}>Price per Team ($)</Text>
          <TextInput
            style={styles.input}
            value={pricePerTeam}
            onChangeText={setPricePerTeam}
            keyboardType="number-pad"
          />

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

          {type === 'LEAGUE' && (
            <>
              <Text style={styles.label}>Number of Weeks</Text>
              <TextInput
                style={styles.input}
                value={numberOfWeeks}
                onChangeText={setNumberOfWeeks}
                keyboardType="number-pad"
                placeholder="e.g., 8"
              />
            </>
          )}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Deposit ($) *</Text>
              <TextInput
                style={styles.input}
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="number-pad"
                placeholder="e.g., 50"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Early Bird Discount ($)</Text>
              <TextInput
                style={styles.input}
                value={earlyBirdDiscount}
                onChangeText={setEarlyBirdDiscount}
                keyboardType="number-pad"
                placeholder="e.g., 25"
              />
            </View>
          </View>

          <Text style={styles.label}>Deposit Deadline *</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={depositDeadline.toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newDate = new Date();
                  newDate.setFullYear(year, month - 1, day);
                  setDepositDeadline(newDate);
                }
              }}
              style={webInputStyle}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDepositDeadlinePicker(true)}
              >
                <Text style={styles.dateTimeText}>{formatDate(depositDeadline)}</Text>
              </TouchableOpacity>
              {showDepositDeadlinePicker && (
                <DateTimePicker
                  value={depositDeadline}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDepositDeadlineChange}
                />
              )}
            </>
          )}

          <Text style={styles.label}>Early Bird Deadline *</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={earlyBirdDeadline.toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newDate = new Date();
                  newDate.setFullYear(year, month - 1, day);
                  setEarlyBirdDeadline(newDate);
                }
              }}
              style={webInputStyle}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEarlyBirdDeadlinePicker(true)}
              >
                <Text style={styles.dateTimeText}>{formatDate(earlyBirdDeadline)}</Text>
              </TouchableOpacity>
              {showEarlyBirdDeadlinePicker && (
                <DateTimePicker
                  value={earlyBirdDeadline}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEarlyBirdDeadlineChange}
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
  courtSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  courtChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: brand.colors.surface,
    borderWidth: 1,
    borderColor: brand.colors.border,
  },
  courtChipSelected: {
    backgroundColor: brand.colors.primary,
    borderColor: brand.colors.primary,
  },
  courtChipText: {
    fontSize: 14,
    color: brand.colors.text,
    fontWeight: '500',
  },
  courtChipTextSelected: {
    color: '#fff',
  },
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
