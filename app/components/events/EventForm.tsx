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
import { Picker } from '@react-native-picker/picker';
import { Event, EventFormData, EventType, SkillLevel, GenderCategory, Player, Enrollment } from '../../shared/types';
import { enrollmentsApi } from '../../shared/api/services';
import { isEventEditable } from '../../shared/utils/eventUtils';
import EnrollmentSection from './EnrollmentSection';

interface EventFormProps {
  visible: boolean;
  event?: Event | null;
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
}

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'CLASS', label: 'Class' },
  { value: 'OPEN_PLAY', label: 'Open Play' },
  { value: 'PRIVATE_EVENT', label: 'Private Event' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'LEAGUE', label: 'League' },
  { value: 'OTHER', label: 'Other' },
];

const skillLevels: { value: SkillLevel; label: string }[] = [
  { value: 'INTRO_I', label: 'Intro I' },
  { value: 'INTRO_II', label: 'Intro II' },
  { value: 'INTRO_III', label: 'Intro III' },
  { value: 'INTRO_IV', label: 'Intro IV' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const genderCategories: { value: GenderCategory; label: string }[] = [
  { value: 'COED', label: 'Coed' },
  { value: 'MENS', label: "Men's" },
  { value: 'WOMENS', label: "Women's" },
];

export default function EventForm({ visible, event, onClose, onSubmit }: EventFormProps) {
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('CLASS');
  const [courtId, setCourtId] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('12');
  const [instructor, setInstructor] = useState('');
  const [level, setLevel] = useState<SkillLevel>('INTRO_I');
  const [gender, setGender] = useState<GenderCategory>('COED');
  const [isYouth, setIsYouth] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Enrollment state
  const [pendingAdds, setPendingAdds] = useState<Record<string, Player>>({});
  const [pendingRemoves, setPendingRemoves] = useState<Record<string, Enrollment>>({});

  const isEditing = !!event;
  const editable = event ? isEventEditable(event.startTime) : true;
  const enrollments = event?.enrollments || [];

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.eventType);
      setCourtId(String(event.courtId));
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndTime(end.toTimeString().slice(0, 5));
      setMaxCapacity(String(event.maxCapacity));
      setInstructor(event.instructor || '');
      setLevel(event.level);
      setGender(event.gender);
      setIsYouth(event.isYouth);
    } else {
      // Reset form for new event
      setTitle('');
      setDescription('');
      setEventType('CLASS');
      setCourtId('1');
      setStartDate('');
      setStartTime('');
      setEndTime('');
      setMaxCapacity('12');
      setInstructor('');
      setLevel('INTRO_I');
      setGender('COED');
      setIsYouth(false);
    }
    // Reset enrollment pending states
    setPendingAdds({});
    setPendingRemoves({});
    setError('');
  }, [event, visible]);

  // Enrollment handlers
  const handleAddPending = (player: Player) => {
    setPendingAdds((prev) => ({ ...prev, [player.id]: player }));
  };

  const handleRemovePending = (enrollment: Enrollment) => {
    setPendingRemoves((prev) => ({ ...prev, [enrollment.id]: enrollment }));
  };

  const handleUndoAdd = (playerId: string) => {
    setPendingAdds((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  };

  const handleUndoRemove = (enrollmentId: string) => {
    setPendingRemoves((prev) => {
      const next = { ...prev };
      delete next[enrollmentId];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!startDate || !startTime || !endTime) {
      setError('Date and times are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${startDate}T${endTime}`);

      const formData: EventFormData = {
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        courtId: parseInt(courtId, 10),
        startTime: startDateTime,
        endTime: endDateTime,
        maxCapacity: parseInt(maxCapacity, 10),
        instructor: instructor.trim() || undefined,
        level,
        gender,
        isYouth,
        isRecurring: false,
      };

      // Save event first
      await onSubmit(formData);

      // Then handle enrollment changes (only for existing events)
      if (event?.id) {
        const addIds = Object.keys(pendingAdds);
        const removeIds = Object.keys(pendingRemoves);

        // Process enrollments - backend handles transactions
        if (addIds.length > 0) {
          await enrollmentsApi.enroll(event.id, addIds);
        }
        if (removeIds.length > 0) {
          await enrollmentsApi.unenroll(event.id, removeIds);
        }
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedEnrollmentChanges =
    Object.keys(pendingAdds).length > 0 || Object.keys(pendingRemoves).length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? (editable ? 'Edit Event' : 'View Event') : 'New Event'}
          </Text>
          {editable ? (
            <TouchableOpacity onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#1976d2" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!editable && (
            <View style={styles.readOnlyBanner}>
              <Text style={styles.readOnlyText}>
                This event can no longer be edited (15+ min past start time)
              </Text>
            </View>
          )}

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={[styles.input, !editable && styles.inputDisabled]}
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            editable={editable}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, !editable && styles.inputDisabled]}
            value={description}
            onChangeText={setDescription}
            placeholder="Event description"
            multiline
            numberOfLines={3}
            editable={editable}
          />

          <Text style={styles.label}>Event Type</Text>
          <View style={[styles.pickerContainer, !editable && styles.inputDisabled]}>
            <Picker
              selectedValue={eventType}
              onValueChange={(value) => setEventType(value)}
              style={styles.picker}
              enabled={editable}
            >
              {eventTypes.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Court</Text>
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={courtId}
                onChangeText={setCourtId}
                keyboardType="number-pad"
                editable={editable}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Max Capacity</Text>
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={maxCapacity}
                onChangeText={setMaxCapacity}
                keyboardType="number-pad"
                editable={editable}
              />
            </View>
          </View>

          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={[styles.input, !editable && styles.inputDisabled]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            editable={editable}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Start Time *</Text>
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                editable={editable}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>End Time *</Text>
              <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM"
                editable={editable}
              />
            </View>
          </View>

          <Text style={styles.label}>Instructor</Text>
          <TextInput
            style={[styles.input, !editable && styles.inputDisabled]}
            value={instructor}
            onChangeText={setInstructor}
            placeholder="Instructor name"
            editable={editable}
          />

          <Text style={styles.label}>Skill Level</Text>
          <View style={[styles.pickerContainer, !editable && styles.inputDisabled]}>
            <Picker
              selectedValue={level}
              onValueChange={(value) => setLevel(value)}
              style={styles.picker}
              enabled={editable}
            >
              {skillLevels.map((l) => (
                <Picker.Item key={l.value} label={l.label} value={l.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Gender Category</Text>
          <View style={[styles.pickerContainer, !editable && styles.inputDisabled]}>
            <Picker
              selectedValue={gender}
              onValueChange={(value) => setGender(value)}
              style={styles.picker}
              enabled={editable}
            >
              {genderCategories.map((g) => (
                <Picker.Item key={g.value} label={g.label} value={g.value} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => editable && setIsYouth(!isYouth)}
            disabled={!editable}
          >
            <View style={[styles.checkbox, isYouth && styles.checkboxChecked, !editable && styles.checkboxDisabled]}>
              {isYouth && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, !editable && styles.textDisabled]}>Youth Event</Text>
          </TouchableOpacity>

          {/* Enrollment Section - only show when editing existing event */}
          {isEditing && (
            <EnrollmentSection
              enrollments={enrollments}
              currentEnrollment={event?.currentEnrollment || 0}
              maxCapacity={event?.maxCapacity || parseInt(maxCapacity, 10)}
              isEditable={editable}
              eventType={eventType}
              pendingAdds={pendingAdds}
              pendingRemoves={pendingRemoves}
              onAddPending={handleAddPending}
              onRemovePending={handleRemovePending}
              onUndoAdd={handleUndoAdd}
              onUndoRemove={handleUndoRemove}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  readOnlyBanner: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  readOnlyText: {
    color: '#e65100',
    textAlign: 'center',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  checkboxDisabled: {
    backgroundColor: '#f5f5f5',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  textDisabled: {
    color: '#999',
  },
  error: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
});
