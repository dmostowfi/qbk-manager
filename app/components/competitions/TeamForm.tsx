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
  KeyboardAvoidingView,
} from 'react-native';
import { Competition } from '../../shared/types';
import { brand } from '../../constants/branding';

interface TeamFormProps {
  visible: boolean;
  competition: Competition;
  onClose: () => void;
  onSubmit: (teamName: string) => Promise<void>;
}

const formatLabels: Record<string, { players: number; label: string }> = {
  INTERMEDIATE_4S: { players: 4, label: '4v4' },
  RECREATIONAL_6S: { players: 6, label: '6v6' },
};

export default function TeamForm({
  visible,
  competition,
  onClose,
  onSubmit,
}: TeamFormProps) {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatInfo = formatLabels[competition.format] || { players: 4, label: 'Team' };

  useEffect(() => {
    if (visible) {
      setTeamName('');
      setError('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(teamName.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Team</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={brand.colors.primary} />
            ) : (
              <Text style={styles.saveButton}>Register</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{competition.name}</Text>
            <Text style={styles.infoText}>
              {formatInfo.label} · ${competition.pricePerTeam}/team
            </Text>
            <Text style={styles.infoNote}>
              You will become the team captain. You'll need {formatInfo.players} players total on your roster.
            </Text>
          </View>

          <Text style={styles.label}>Team Name *</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="e.g., Beach Bombers"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <Text style={styles.hint}>
            Choose a fun, memorable name for your team. You can always change it later.
          </Text>
        </View>
      </KeyboardAvoidingView>
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
  content: {
    padding: 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  infoBox: {
    backgroundColor: brand.sidebar.activeBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: brand.colors.textLight,
    marginBottom: 8,
  },
  infoNote: {
    fontSize: 13,
    color: brand.colors.primary,
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
    backgroundColor: brand.colors.background,
    borderWidth: 0,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: brand.colors.text,
  },
  hint: {
    fontSize: 13,
    color: brand.colors.textMuted,
  },
  error: {
    color: brand.colors.error,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
