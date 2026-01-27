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
} from 'react-native';
import dayjs from 'dayjs';
import { Match } from '../../shared/types';
import { brand } from '../../constants/branding';

interface RecordScoreModalProps {
  visible: boolean;
  match: Match | null;
  onClose: () => void;
  onSubmit: (matchId: string, team1Score: number, team2Score: number) => Promise<void>;
}

export default function RecordScoreModal({
  visible,
  match,
  onClose,
  onSubmit,
}: RecordScoreModalProps) {
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && match) {
      setTeam1Score(match.team1Score?.toString() ?? '');
      setTeam2Score(match.team2Score?.toString() ?? '');
      setError('');
    }
  }, [visible, match]);

  if (!match) return null;

  const team1Name = match.team1?.name ?? 'Team 1';
  const team2Name = match.team2?.name ?? 'Team 2';
  const matchDate = match.event?.startTime ? dayjs(match.event.startTime) : null;

  const handleSubmit = async () => {
    const score1 = parseInt(team1Score, 10);
    const score2 = parseInt(team2Score, 10);

    if (isNaN(score1) || score1 < 0) {
      setError('Please enter a valid score for ' + team1Name);
      return;
    }
    if (isNaN(score2) || score2 < 0) {
      setError('Please enter a valid score for ' + team2Name);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(match.id, score1, score2);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record score');
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
          <Text style={styles.headerTitle}>Record Score</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={brand.colors.primary} />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Match Info */}
          <View style={styles.matchInfo}>
            {matchDate && (
              <Text style={styles.matchDate}>
                Week {match.roundNumber} · {matchDate.format('ddd, MMM D @ h:mm A')}
              </Text>
            )}
          </View>

          {/* Score Entry */}
          <View style={styles.scoreEntry}>
            <View style={styles.teamScore}>
              <Text style={styles.teamName} numberOfLines={2}>{team1Name}</Text>
              <TextInput
                style={styles.scoreInput}
                value={team1Score}
                onChangeText={setTeam1Score}
                keyboardType="number-pad"
                placeholder="0"
                maxLength={3}
              />
            </View>

            <Text style={styles.vs}>vs</Text>

            <View style={styles.teamScore}>
              <Text style={styles.teamName} numberOfLines={2}>{team2Name}</Text>
              <TextInput
                style={styles.scoreInput}
                value={team2Score}
                onChangeText={setTeam2Score}
                keyboardType="number-pad"
                placeholder="0"
                maxLength={3}
              />
            </View>
          </View>

          <Text style={styles.hint}>
            Enter the final score for each team
          </Text>
        </View>
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
  content: {
    padding: 24,
    alignItems: 'center',
  },
  matchInfo: {
    marginBottom: 32,
  },
  matchDate: {
    fontSize: 15,
    color: brand.colors.textLight,
    textAlign: 'center',
  },
  scoreEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  teamScore: {
    alignItems: 'center',
    width: 120,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.colors.text,
    textAlign: 'center',
    marginBottom: 12,
    minHeight: 40,
  },
  scoreInput: {
    backgroundColor: brand.colors.background,
    borderRadius: 12,
    width: 80,
    height: 80,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    color: brand.colors.text,
  },
  vs: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.colors.textMuted,
    marginTop: 24,
  },
  hint: {
    fontSize: 13,
    color: brand.colors.textMuted,
    textAlign: 'center',
  },
  error: {
    color: brand.colors.error,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
