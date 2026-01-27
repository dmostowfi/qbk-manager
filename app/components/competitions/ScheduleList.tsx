import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import dayjs from 'dayjs';
import { Match } from '../../shared/types';
import { brand } from '../../constants/branding';

interface ScheduleListProps {
  matches: Match[];
  onMatchPress?: (match: Match) => void;
  canGenerateSchedule?: boolean;
  onGenerateSchedule?: () => void;
}

interface MatchSection {
  title: string;
  data: Match[];
}

export default function ScheduleList({ matches, onMatchPress, canGenerateSchedule, onGenerateSchedule }: ScheduleListProps) {
  if (matches.length === 0) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="calendar" size={40} color={brand.colors.border} />
        <Text style={styles.emptyText}>No schedule generated yet</Text>
        {canGenerateSchedule && onGenerateSchedule && (
          <>
            <Text style={styles.emptySubtext}>Generate a round-robin schedule for all teams</Text>
            <TouchableOpacity style={styles.generateButton} onPress={onGenerateSchedule}>
              <FontAwesome name="magic" size={16} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Schedule</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // Group matches by round
  const sections: MatchSection[] = [];
  const grouped = new Map<number, Match[]>();

  matches.forEach((match) => {
    const round = match.roundNumber;
    if (!grouped.has(round)) {
      grouped.set(round, []);
    }
    grouped.get(round)!.push(match);
  });

  // Sort by round number and create sections
  Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([round, roundMatches]) => {
      sections.push({
        title: `Week ${round}`,
        data: roundMatches.sort((a, b) => {
          const dateA = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
          const dateB = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
          return dateA - dateB;
        }),
      });
    });

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => <MatchRow match={item} onPress={onMatchPress} />}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
    />
  );
}

function MatchRow({
  match,
  onPress,
}: {
  match: Match;
  onPress?: (match: Match) => void;
}) {
  const homeName = match.homeTeam?.name ?? 'TBD';
  const awayName = match.awayTeam?.name ?? 'TBD';
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const eventDate = match.event?.startTime ? dayjs(match.event.startTime) : null;
  const courtId = match.event?.courtId;

  return (
    <View style={styles.matchRow}>
      <View style={styles.matchInfo}>
        {eventDate && (
          <Text style={styles.matchDate}>
            {eventDate.format('ddd, MMM D')} · {eventDate.format('h:mm A')}
            {courtId && ` · Court ${courtId}`}
          </Text>
        )}
        <View style={styles.teamsRow}>
          <Text style={[styles.teamName, hasScore && match.homeScore! > match.awayScore! && styles.winner]}>
            {homeName}
          </Text>
          <Text style={styles.vs}>vs</Text>
          <Text style={[styles.teamName, hasScore && match.awayScore! > match.homeScore! && styles.winner]}>
            {awayName}
          </Text>
        </View>
      </View>
      {hasScore ? (
        <View style={styles.scoreBox}>
          <Text style={styles.score}>
            {match.homeScore} - {match.awayScore}
          </Text>
        </View>
      ) : (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingText}>TBD</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: brand.colors.textLight,
  },
  emptySubtext: {
    fontSize: 13,
    color: brand.colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brand.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  matchInfo: {
    flex: 1,
  },
  matchDate: {
    fontSize: 12,
    color: brand.colors.textLight,
    marginBottom: 4,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.colors.text,
  },
  winner: {
    fontWeight: '700',
    color: brand.colors.primary,
  },
  vs: {
    fontSize: 12,
    color: brand.colors.textMuted,
    marginHorizontal: 8,
  },
  scoreBox: {
    backgroundColor: brand.sidebar.activeBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.colors.primary,
  },
  pendingBox: {
    backgroundColor: brand.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 12,
    color: brand.colors.textMuted,
  },
});
