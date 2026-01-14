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
import { Event, EventFormData, EventType, SkillLevel, GenderCategory, Player, Enrollment } from '../../shared/types';
import { enrollmentsApi, meApi } from '../../shared/api/services';
import { isEventEditable, getEnrollmentEligibilityError } from '../../shared/utils/eventUtils';
import EnrollmentSection from './EnrollmentSection';
import { brand } from '../../constants/branding';

interface EventFormProps {
  visible: boolean;
  event?: Event | null;
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  // Player enrollment props
  isEnrolled?: boolean;
  canEnroll?: boolean;
  onEnroll?: () => void;
  onUnenroll?: () => void;
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

export default function EventForm({
  visible,
  event,
  onClose,
  onSubmit,
  isEnrolled,
  canEnroll,
  onEnroll,
  onUnenroll,
}: EventFormProps) {
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('CLASS');
  const [courtId, setCourtId] = useState('1');
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [startTimeDate, setStartTimeDate] = useState<Date>(new Date());
  const [endTimeDate, setEndTimeDate] = useState<Date>(new Date());
  const [maxCapacity, setMaxCapacity] = useState('12');
  const [instructor, setInstructor] = useState('');
  const [level, setLevel] = useState<SkillLevel>('INTRO_I');
  const [gender, setGender] = useState<GenderCategory>('COED');
  const [isYouth, setIsYouth] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date/time picker visibility (for Android/web)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Enrollment state (admin)
  const [pendingAdds, setPendingAdds] = useState<Record<string, Player>>({});
  const [pendingRemoves, setPendingRemoves] = useState<Record<string, Enrollment>>({});

  // Player self-enrollment state
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const isEditing = !!event;
  // Players (canEnroll) always see read-only form; admins can edit if event hasn't started
  const editable = !canEnroll && (event ? isEventEditable(event.startTime) : true);
  const enrollments = event?.enrollments || [];

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.eventType);
      setCourtId(String(event.courtId));
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      setEventDate(start);
      setStartTimeDate(start);
      setEndTimeDate(end);
      setMaxCapacity(String(event.maxCapacity));
      setInstructor(event.instructor || '');
      setLevel(event.level);
      setGender(event.gender);
      setIsYouth(event.isYouth);
    } else {
      // Reset form for new event with sensible defaults
      const now = new Date();
      const defaultStart = new Date(now);
      defaultStart.setHours(now.getHours() + 1, 0, 0, 0); // Next hour, rounded
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setHours(defaultStart.getHours() + 1); // 1 hour duration

      setTitle('');
      setDescription('');
      setEventType('CLASS');
      setCourtId('1');
      setEventDate(defaultStart);
      setStartTimeDate(defaultStart);
      setEndTimeDate(defaultEnd);
      setMaxCapacity('12');
      setInstructor('');
      setLevel('INTRO_I');
      setGender('COED');
      setIsYouth(false);
    }
    // Reset enrollment pending states and picker visibility
    setPendingAdds({});
    setPendingRemoves({});
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setEligibilityError(null);
    setError('');
  }, [event, visible]);

  // Fetch fresh player data for eligibility check (mirrors admin search flow)
  useEffect(() => {
    if (!visible || !canEnroll || !event) {
      return;
    }

    const checkPlayerEligibility = async () => {
      setCheckingEligibility(true);
      try {
        const profile = await meApi.getProfile();
        const error = getEnrollmentEligibilityError(profile, event.eventType);
        setEligibilityError(error);
      } catch (err) {
        console.error('Failed to check eligibility:', err);
        setEligibilityError('Unable to verify eligibility');
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkPlayerEligibility();
  }, [visible, canEnroll, event]);

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

  // Date/time picker handlers
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setStartTimeDate(selectedTime);
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEndTimeDate(selectedTime);
    }
  };

  // Format helpers
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Combine date and time into full DateTime objects
    const startDateTime = new Date(eventDate);
    startDateTime.setHours(startTimeDate.getHours(), startTimeDate.getMinutes(), 0, 0);

    const endDateTime = new Date(eventDate);
    endDateTime.setHours(endTimeDate.getHours(), endTimeDate.getMinutes(), 0, 0);

    // Validate: cannot create events in the past
    if (!isEditing) {
      const now = new Date();
      if (startDateTime < now) {
        setError('Cannot create an event in the past');
        return;
      }
    }

    // Validate: end time must be after start time
    if (endDateTime <= startDateTime) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError('');

    try {
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
                <ActivityIndicator size="small" color={brand.colors.primary} />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContentContainer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!editable && !canEnroll && (
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
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={eventDate.toISOString().split('T')[0]}
              min={isEditing ? undefined : new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newDate = new Date(eventDate);
                  newDate.setFullYear(year, month - 1, day);
                  setEventDate(newDate);
                }
              }}
              disabled={!editable}
              style={{
                padding: 14,
                fontSize: 15,
                border: 'none',
                borderRadius: 10,
                marginBottom: 20,
                backgroundColor: editable ? brand.colors.surface : brand.colors.background,
                color: editable ? brand.colors.text : brand.colors.textMuted,
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
              } as any}
            />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.dateTimeButton, !editable && styles.inputDisabled]}
                onPress={() => editable && setShowDatePicker(true)}
                disabled={!editable}
              >
                <Text style={[styles.dateTimeText, !editable && styles.textDisabled]}>
                  {formatDate(eventDate)}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={isEditing ? undefined : new Date()}
                />
              )}
            </>
          )}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Start Time *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={`${String(startTimeDate.getHours()).padStart(2, '0')}:${String(startTimeDate.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newTime = new Date(startTimeDate);
                      newTime.setHours(hours, minutes);
                      setStartTimeDate(newTime);
                    }
                  }}
                  disabled={!editable}
                  style={{
                    padding: 14,
                    fontSize: 15,
                    border: 'none',
                    borderRadius: 10,
                    marginBottom: 20,
                    backgroundColor: editable ? brand.colors.surface : brand.colors.background,
                    color: editable ? brand.colors.text : brand.colors.textMuted,
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                  } as any}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, !editable && styles.inputDisabled]}
                    onPress={() => editable && setShowStartTimePicker(true)}
                    disabled={!editable}
                  >
                    <Text style={[styles.dateTimeText, !editable && styles.textDisabled]}>
                      {formatTime(startTimeDate)}
                    </Text>
                  </TouchableOpacity>
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startTimeDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleStartTimeChange}
                      minuteInterval={5}
                    />
                  )}
                </>
              )}
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>End Time *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={`${String(endTimeDate.getHours()).padStart(2, '0')}:${String(endTimeDate.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newTime = new Date(endTimeDate);
                      newTime.setHours(hours, minutes);
                      setEndTimeDate(newTime);
                    }
                  }}
                  disabled={!editable}
                  style={{
                    padding: 14,
                    fontSize: 15,
                    border: 'none',
                    borderRadius: 10,
                    marginBottom: 20,
                    backgroundColor: editable ? brand.colors.surface : brand.colors.background,
                    color: editable ? brand.colors.text : brand.colors.textMuted,
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                  } as any}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, !editable && styles.inputDisabled]}
                    onPress={() => editable && setShowEndTimePicker(true)}
                    disabled={!editable}
                  >
                    <Text style={[styles.dateTimeText, !editable && styles.textDisabled]}>
                      {formatTime(endTimeDate)}
                    </Text>
                  </TouchableOpacity>
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endTimeDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndTimeChange}
                      minuteInterval={5}
                    />
                  )}
                </>
              )}
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

          {/* Player Self-Enrollment Section */}
          {isEditing && canEnroll && (
            <View style={styles.playerEnrollmentSection}>
              <Text style={styles.enrollmentTitle}>Enrollment</Text>
              <Text style={styles.enrollmentCapacity}>
                {event?.currentEnrollment || 0} / {event?.maxCapacity || 0} spots filled
              </Text>
              {checkingEligibility ? (
                <ActivityIndicator size="small" color={brand.colors.primary} style={{ padding: 16 }} />
              ) : eligibilityError ? (
                <View style={styles.eligibilityErrorContainer}>
                  <Text style={styles.eligibilityErrorText}>{eligibilityError}</Text>
                  <Text style={styles.eligibilityErrorHint}>
                    You are not eligible to enroll in this event
                  </Text>
                </View>
              ) : isEnrolled ? (
                <TouchableOpacity
                  style={styles.unenrollButton}
                  onPress={onUnenroll}
                >
                  <Text style={styles.unenrollButtonText}>Unenroll from Event</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.enrollButton,
                    (event?.currentEnrollment || 0) >= (event?.maxCapacity || 0) && styles.enrollButtonDisabled,
                  ]}
                  onPress={onEnroll}
                  disabled={(event?.currentEnrollment || 0) >= (event?.maxCapacity || 0)}
                >
                  <Text style={styles.enrollButtonText}>
                    {(event?.currentEnrollment || 0) >= (event?.maxCapacity || 0)
                      ? 'Event Full'
                      : 'Enroll in Event'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Admin Enrollment Section - only show when editing existing event and user can edit */}
          {isEditing && editable && !canEnroll && (
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
  readOnlyBanner: {
    backgroundColor: '#FFF8E1',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  readOnlyText: {
    color: '#F57C00',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
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
  inputDisabled: {
    backgroundColor: brand.colors.background,
    color: brand.colors.textMuted,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: brand.colors.surface,
    padding: 14,
    borderRadius: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: brand.colors.border,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: brand.colors.primary,
    borderColor: brand.colors.primary,
  },
  checkboxDisabled: {
    backgroundColor: brand.colors.background,
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 15,
    color: brand.colors.text,
    fontWeight: '500',
  },
  textDisabled: {
    color: brand.colors.textMuted,
  },
  error: {
    color: brand.colors.error,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  playerEnrollmentSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: brand.colors.border,
  },
  enrollmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  enrollmentCapacity: {
    fontSize: 14,
    color: brand.colors.textLight,
    marginBottom: 16,
  },
  enrollButton: {
    backgroundColor: brand.colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  enrollButtonDisabled: {
    backgroundColor: brand.colors.border,
  },
  enrollButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unenrollButton: {
    backgroundColor: brand.colors.surface,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.colors.error,
  },
  unenrollButtonText: {
    color: brand.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  eligibilityErrorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  eligibilityErrorText: {
    color: brand.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  eligibilityErrorHint: {
    color: brand.colors.error,
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
});
