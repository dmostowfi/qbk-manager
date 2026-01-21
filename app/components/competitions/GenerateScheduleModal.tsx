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
  ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { ScheduleConfig } from '../../shared/types';
import { brand } from '../../constants/branding';

interface GenerateScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (config: ScheduleConfig) => Promise<void>;
}

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function GenerateScheduleModal({
  visible,
  onClose,
  onSubmit,
}: GenerateScheduleModalProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [dayOfWeek, setDayOfWeek] = useState(3); // Wednesday
  const [numberOfWeeks, setNumberOfWeeks] = useState('8');
  const [courtIds, setCourtIds] = useState('1,2,3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset to defaults
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setStartDate(nextWeek);
      setDayOfWeek(3);
      setNumberOfWeeks('8');
      setCourtIds('1,2,3');
      setError('');
    }
  }, [visible]);

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
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
    const weeks = parseInt(numberOfWeeks, 10);
    if (isNaN(weeks) || weeks < 1 || weeks > 52) {
      setError('Number of weeks must be between 1 and 52');
      return;
    }

    const courts = courtIds
      .split(',')
      .map((c) => parseInt(c.trim(), 10))
      .filter((c) => !isNaN(c));

    if (courts.length === 0) {
      setError('Please enter at least one court ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const config: ScheduleConfig = {
        startDate,
        dayOfWeek,
        numberOfWeeks: weeks,
        courtIds: courts,
      };
      await onSubmit(config);
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
              This will create Events and Matches for a round-robin schedule where each team plays every other team.
            </Text>
          </View>

          <Text style={styles.label}>Start Date</Text>
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
              style={{
                padding: 14,
                fontSize: 15,
                border: 'none',
                borderRadius: 10,
                marginBottom: 20,
                backgroundColor: brand.colors.surface,
                color: brand.colors.text,
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
              } as any}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </>
          )}

          <Text style={styles.label}>Day of Week</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={dayOfWeek}
              onValueChange={(value) => setDayOfWeek(value)}
              style={styles.picker}
            >
              {daysOfWeek.map((day) => (
                <Picker.Item key={day.value} label={day.label} value={day.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Number of Weeks</Text>
          <TextInput
            style={styles.input}
            value={numberOfWeeks}
            onChangeText={setNumberOfWeeks}
            keyboardType="number-pad"
            placeholder="8"
          />

          <Text style={styles.label}>Court IDs (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={courtIds}
            onChangeText={setCourtIds}
            placeholder="1,2,3"
          />
          <Text style={styles.hint}>
            Enter the court numbers to use for matches (e.g., 1,2,3)
          </Text>
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
  dateButton: {
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 15,
    color: brand.colors.text,
  },
  pickerContainer: {
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    backgroundColor: 'transparent',
  } as any,
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
