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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Player, MembershipType, MembershipStatus, UserProfile } from '../../shared/types';
import { PlayerFormData, ProfileUpdateData } from '../../shared/api/services';
import { brand } from '../../constants/branding';

type PlayerData = Player | UserProfile;

interface PlayerFormProps {
  visible: boolean;
  player: PlayerData | null;
  onClose: () => void;
  onSubmit: (data: Partial<PlayerFormData> | ProfileUpdateData) => Promise<void>;
  mode?: 'admin' | 'player';
}

const membershipTypes: { value: MembershipType; label: string }[] = [
  { value: 'GOLD', label: 'Gold' },
  { value: 'DROP_IN', label: 'Drop-in' },
  { value: 'NONE', label: 'None' },
];

const membershipStatuses: { value: MembershipStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const membershipLabels: Record<string, string> = {
  GOLD: 'Gold',
  DROP_IN: 'Drop-in',
  NONE: 'None',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
};

// Helper to parse date string to Date object
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Helper to format Date to ISO-8601 DateTime string for API
function formatDateForApi(date: Date | null): string | undefined {
  if (!date) return undefined;
  // Send full ISO string (e.g., "2000-01-15T00:00:00.000Z")
  return date.toISOString();
}

// Helper to format Date for display
function formatDateForDisplay(date: Date | null): string {
  if (!date) return 'Select date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function PlayerForm({ visible, player, onClose, onSubmit, mode = 'admin' }: PlayerFormProps) {
  const isAdmin = mode === 'admin';
  const isPlayer = mode === 'player';

  // Identity fields (always read-only)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Contact info fields (editable by player, optionally by admin)
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Membership fields (editable by admin only)
  const [membershipType, setMembershipType] = useState<MembershipType>('NONE');
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('ACTIVE');
  const [classCredits, setClassCredits] = useState('0');
  const [dropInCredits, setDropInCredits] = useState('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (player) {
      setFirstName(player.firstName);
      setLastName(player.lastName);
      setEmail(player.email);
      setPhone(player.phone || '');
      setStreetAddress(player.streetAddress || '');
      setCity(player.city || '');
      setState(player.state || '');
      setZipCode(player.zipCode || '');
      setDateOfBirth(parseDate(player.dateOfBirth));
      setMembershipType(player.membershipType || 'NONE');
      setMembershipStatus(player.membershipStatus || 'ACTIVE');
      setClassCredits(String(player.classCredits ?? 0));
      setDropInCredits(String(player.dropInCredits ?? 0));
    }
    setError('');
    setShowDatePicker(false);
  }, [player, visible]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android, the picker is a modal that closes after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      if (isAdmin) {
        // Admin: submit membership/credit fields + contact info
        const formData: Partial<PlayerFormData> = {
          phone: phone.trim() || undefined,
          streetAddress: streetAddress.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zipCode: zipCode.trim() || undefined,
          dateOfBirth: formatDateForApi(dateOfBirth),
          membershipType,
          membershipStatus,
          classCredits: parseInt(classCredits, 10) || 0,
          dropInCredits: parseInt(dropInCredits, 10) || 0,
        };
        await onSubmit(formData);
      } else {
        // Player: submit contact info only
        const formData: ProfileUpdateData = {
          phone: phone.trim() || undefined,
          streetAddress: streetAddress.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zipCode: zipCode.trim() || undefined,
          dateOfBirth: formatDateForApi(dateOfBirth),
        };
        await onSubmit(formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (!player) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isAdmin ? 'Edit Player' : 'Edit Profile'}
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

          {/* Identity Section */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={firstName}
                editable={false}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={lastName}
                editable={false}
              />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.readOnly]}
            value={email}
            editable={false}
          />

          <Text style={styles.helperText}>Name and email are managed by your authentication provider</Text>

          {/* Contact Info Section */}
          <Text style={styles.sectionHeader}>Contact Information</Text>

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="(555) 123-4567"
            placeholderTextColor={brand.colors.textMuted}
          />

          <Text style={styles.label}>Street Address</Text>
          <TextInput
            style={styles.input}
            value={streetAddress}
            onChangeText={setStreetAddress}
            placeholder="123 Main Street"
            placeholderTextColor={brand.colors.textMuted}
          />

          <View style={styles.row}>
            <View style={styles.flex2}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={brand.colors.textMuted}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="CA"
                placeholderTextColor={brand.colors.textMuted}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>ZIP</Text>
              <TextInput
                style={styles.input}
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="12345"
                placeholderTextColor={brand.colors.textMuted}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          <Text style={styles.label}>Date of Birth</Text>
          {Platform.OS === 'web' ? (
            // Web: Use native HTML date input
            <input
              type="date"
              value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const val = e.target.value;
                setDateOfBirth(val ? new Date(val + 'T00:00:00') : null);
              }}
              max={new Date().toISOString().split('T')[0]}
              style={{
                backgroundColor: brand.colors.surface,
                border: 'none',
                borderRadius: 10,
                padding: 14,
                fontSize: 15,
                marginBottom: 20,
                color: brand.colors.text,
                width: '100%',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            />
          ) : (
            // Native: Use TouchableOpacity to trigger DateTimePicker
            <>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[
                  styles.datePickerText,
                  !dateOfBirth && styles.datePickerPlaceholder
                ]}>
                  {formatDateForDisplay(dateOfBirth)}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth || new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1920, 0, 1)}
                />
              )}
            </>
          )}

          {/* Membership Section */}
          <Text style={styles.sectionHeader}>Membership</Text>

          {isAdmin ? (
            <>
              <Text style={styles.label}>Membership Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={membershipType}
                  onValueChange={(value) => setMembershipType(value)}
                  style={styles.picker}
                >
                  {membershipTypes.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Membership Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={membershipStatus}
                  onValueChange={(value) => setMembershipStatus(value)}
                  style={styles.picker}
                >
                  {membershipStatuses.map((status) => (
                    <Picker.Item key={status.value} label={status.label} value={status.value} />
                  ))}
                </Picker>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Class Credits</Text>
                  <TextInput
                    style={styles.input}
                    value={classCredits}
                    onChangeText={setClassCredits}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Drop-in Credits</Text>
                  <TextInput
                    style={styles.input}
                    value={dropInCredits}
                    onChangeText={setDropInCredits}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Player view: read-only membership info */}
              <View style={styles.membershipInfoCard}>
                <View style={styles.membershipInfoRow}>
                  <Text style={styles.membershipInfoLabel}>Type</Text>
                  <Text style={styles.membershipInfoValue}>
                    {membershipLabels[membershipType] || membershipType}
                  </Text>
                </View>
                <View style={styles.membershipInfoRow}>
                  <Text style={styles.membershipInfoLabel}>Status</Text>
                  <Text style={styles.membershipInfoValue}>
                    {statusLabels[membershipStatus] || membershipStatus}
                  </Text>
                </View>
                <View style={styles.membershipInfoRow}>
                  <Text style={styles.membershipInfoLabel}>Class Credits</Text>
                  <Text style={styles.membershipInfoValue}>{classCredits}</Text>
                </View>
                <View style={styles.membershipInfoRow}>
                  <Text style={styles.membershipInfoLabel}>Drop-in Credits</Text>
                  <Text style={styles.membershipInfoValue}>{dropInCredits}</Text>
                </View>
              </View>
              <Text style={styles.helperText}>
                Membership and credits are managed through purchases
              </Text>
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
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brand.colors.border,
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
  readOnly: {
    backgroundColor: brand.colors.background,
    color: brand.colors.textLight,
  },
  helperText: {
    fontSize: 12,
    color: brand.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 20,
    marginTop: -12,
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
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  error: {
    color: brand.colors.error,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  membershipInfoCard: {
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  membershipInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  membershipInfoLabel: {
    fontSize: 14,
    color: brand.colors.textLight,
  },
  membershipInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.colors.text,
  },
  datePickerButton: {
    backgroundColor: brand.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  datePickerText: {
    fontSize: 15,
    color: brand.colors.text,
  },
  datePickerPlaceholder: {
    color: brand.colors.textMuted,
  },
});
