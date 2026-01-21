import { View, Text, StyleSheet, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Standing } from '../../shared/types';
import { brand } from '../../constants/branding';

interface StandingsTableProps {
  standings: Standing[];
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="list-ol" size={40} color={brand.colors.border} />
        <Text style={styles.emptyText}>No standings available yet</Text>
        <Text style={styles.emptySubtext}>Standings will appear after matches are played</Text>
      </View>
    );
  }

  // Sort by points (desc), then wins (desc), then losses (asc)
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.rankCell]}>#</Text>
        <Text style={[styles.headerCell, styles.teamCell]}>Team</Text>
        <Text style={[styles.headerCell, styles.statCell]}>W</Text>
        <Text style={[styles.headerCell, styles.statCell]}>L</Text>
        <Text style={[styles.headerCell, styles.statCell]}>T</Text>
        <Text style={[styles.headerCell, styles.statCell]}>GP</Text>
        <Text style={[styles.headerCell, styles.ptsCell]}>PTS</Text>
      </View>

      {/* Rows */}
      {sorted.map((standing, index) => (
        <View
          key={standing.teamId}
          style={[styles.row, index === 0 && styles.firstPlace, index % 2 === 1 && styles.rowAlt]}
        >
          <Text style={[styles.cell, styles.rankCell, index === 0 && styles.firstPlaceText]}>
            {index + 1}
          </Text>
          <Text style={[styles.cell, styles.teamCell, styles.teamName]} numberOfLines={1}>
            {standing.teamName}
          </Text>
          <Text style={[styles.cell, styles.statCell]}>{standing.wins}</Text>
          <Text style={[styles.cell, styles.statCell]}>{standing.losses}</Text>
          <Text style={[styles.cell, styles.statCell]}>{standing.ties}</Text>
          <Text style={[styles.cell, styles.statCell]}>{standing.gamesPlayed}</Text>
          <Text style={[styles.cell, styles.ptsCell, styles.ptsValue]}>{standing.points}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: brand.colors.textLight,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: brand.colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: brand.colors.text,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: brand.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
  },
  rowAlt: {
    backgroundColor: brand.colors.background,
  },
  firstPlace: {
    backgroundColor: brand.sidebar.activeBackground,
    borderLeftWidth: 3,
    borderLeftColor: brand.colors.primary,
  },
  firstPlaceText: {
    color: brand.colors.primary,
    fontWeight: '700',
  },
  cell: {
    fontSize: 14,
    color: brand.colors.text,
  },
  rankCell: {
    width: 30,
    textAlign: 'center',
  },
  teamCell: {
    flex: 1,
    paddingRight: 8,
  },
  teamName: {
    fontWeight: '500',
  },
  statCell: {
    width: 32,
    textAlign: 'center',
  },
  ptsCell: {
    width: 40,
    textAlign: 'center',
  },
  ptsValue: {
    fontWeight: '700',
    color: brand.colors.primary,
  },
});
