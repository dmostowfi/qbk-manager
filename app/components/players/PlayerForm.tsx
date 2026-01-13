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
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData: Partial<PlayerFormData> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
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
              <ActivityIndicator size="small" color="#1976d2" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.readOnly]}
            value={email}
            editable={false}
          />

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
  readOnly: {
    backgroundColor: '#f5f5f5',
    color: '#666',
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
  error: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
});
