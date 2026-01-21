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
  onSubmit: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
}

export default function RecordScoreModal({
  visible,
  match,
  onClose,
  onSubmit,
}: RecordScoreModalProps) {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && match) {
      setHomeScore(match.homeScore?.toString() ?? '');
      setAwayScore(match.awayScore?.toString() ?? '');
      setError('');
    }
  }, [visible, match]);

  if (!match) return null;

  const homeName = match.homeTeam?.name ?? 'Home Team';
  const awayName = match.awayTeam?.name ?? 'Away Team';
  const matchDate = match.event?.startTime ? dayjs(match.event.startTime) : null;

  const handleSubmit = async () => {
    const home = parseInt(homeScore, 10);
    const away = parseInt(awayScore, 10);

    if (isNaN(home) || home < 0) {
      setError('Please enter a valid home score');
      return;
    }
    if (isNaN(away) || away < 0) {
      setError('Please enter a valid away score');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(match.id, home, away);
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
              <Text style={styles.teamName} numberOfLines={2}>{homeName}</Text>
              <TextInput
                style={styles.scoreInput}
                value={homeScore}
                onChangeText={setHomeScore}
                keyboardType="number-pad"
                placeholder="0"
                maxLength={3}
              />
            </View>

            <Text style={styles.vs}>vs</Text>

            <View style={styles.teamScore}>
              <Text style={styles.teamName} numberOfLines={2}>{awayName}</Text>
              <TextInput
                style={styles.scoreInput}
                value={awayScore}
                onChangeText={setAwayScore}
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
