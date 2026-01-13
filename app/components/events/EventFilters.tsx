import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { EventFilters as EventFiltersType, EventType, SkillLevel, GenderCategory } from '../../shared/types';

interface EventFiltersProps {
  visible: boolean;
  filters: EventFiltersType;
  onClose: () => void;
  onApply: (filters: EventFiltersType) => void;
}

const eventTypes: { value: EventType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'CLASS', label: 'Class' },
  { value: 'OPEN_PLAY', label: 'Open Play' },
  { value: 'PRIVATE_EVENT', label: 'Private Event' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'LEAGUE', label: 'League' },
  { value: 'OTHER', label: 'Other' },
];

const skillLevels: { value: SkillLevel | ''; label: string }[] = [
  { value: '', label: 'All Levels' },
  { value: 'INTRO_I', label: 'Intro I' },
  { value: 'INTRO_II', label: 'Intro II' },
  { value: 'INTRO_III', label: 'Intro III' },
  { value: 'INTRO_IV', label: 'Intro IV' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const genderCategories: { value: GenderCategory | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'COED', label: 'Coed' },
  { value: 'MENS', label: "Men's" },
  { value: 'WOMENS', label: "Women's" },
];

export default function EventFilters({ visible, filters, onClose, onApply }: EventFiltersProps) {
  const [eventType, setEventType] = useState<EventType | ''>(filters.eventType || '');
  const [level, setLevel] = useState<SkillLevel | ''>(filters.level || '');
  const [gender, setGender] = useState<GenderCategory | ''>(filters.gender || '');

  const handleApply = () => {
    onApply({
      ...filters,
      eventType: eventType || undefined,
      level: level || undefined,
      gender: gender || undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setEventType('');
    setLevel('');
    setGender('');
    onApply({});
    onClose();
  };

  const hasFilters = eventType || level || gender;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={handleApply}>
            <Text style={styles.applyButton}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.label}>Event Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={eventType}
              onValueChange={(value) => setEventType(value)}
              style={styles.picker}
            >
              {eventTypes.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Skill Level</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={level}
              onValueChange={(value) => setLevel(value)}
              style={styles.picker}
            >
              {skillLevels.map((l) => (
                <Picker.Item key={l.value} label={l.label} value={l.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Gender Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={(value) => setGender(value)}
              style={styles.picker}
            >
              {genderCategories.map((g) => (
                <Picker.Item key={g.value} label={g.label} value={g.value} />
              ))}
            </Picker>
          </View>

          {hasFilters && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
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
  applyButton: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
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
  clearButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#d32f2f',
    fontSize: 16,
  },
});
