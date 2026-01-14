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
import { Player, MembershipType, MembershipStatus } from '../../shared/types';
import { PlayerFormData } from '../../shared/api/services';
import { brand } from '../../constants/branding';

interface PlayerFormProps {
  visible: boolean;
  player: Player | null;
  onClose: () => void;
  onSubmit: (data: Partial<PlayerFormData>) => Promise<void>;
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

export default function PlayerForm({ visible, player, onClose, onSubmit }: PlayerFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
      setMembershipType(player.membershipType);
      setMembershipStatus(player.membershipStatus);
      setClassCredits(String(player.classCredits));
      setDropInCredits(String(player.dropInCredits));
    }
    setError('');
  }, [player, visible]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Only submit editable fields (name and email come from Clerk)
      const formData: Partial<PlayerFormData> = {
        phone: phone.trim() || undefined,
        membershipType,
        membershipStatus,
        classCredits: parseInt(classCredits, 10) || 0,
        dropInCredits: parseInt(dropInCredits, 10) || 0,
      };

      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save player');
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
          <Text style={styles.headerTitle}>Edit Player</Text>
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

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

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
  error: {
    color: brand.colors.error,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
