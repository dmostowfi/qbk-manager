import { useState, useEffect, useCallback } from 'react';
import { Competition, Team, Match, Standing } from '../types';
import { competitionsApi, teamsApi } from '../api/services';

interface UseCompetitionResult {
  competition: Competition | null;
  teams: Team[];
  matches: Match[];
  standings: Standing[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refetchTeams: () => Promise<void>;
  refetchMatches: () => Promise<void>;
  refetchStandings: () => Promise<void>;
}

export function useCompetition(id: string | undefined): UseCompetitionResult {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetition = useCallback(async () => {
    if (!id) return;
    try {
      const data = await competitionsApi.getById(id);
      setCompetition(data);
    } catch (err) {
      throw err;
    }
  }, [id]);

  const fetchTeams = useCallback(async () => {
    if (!id) return;
    try {
      const data = await teamsApi.getByCompetition(id);
      setTeams(data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  }, [id]);

  const fetchMatches = useCallback(async () => {
    if (!id) return;
    try {
      const data = await competitionsApi.getMatches(id);
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    }
  }, [id]);

  const fetchStandings = useCallback(async () => {
    if (!id) return;
    try {
      const data = await competitionsApi.getStandings(id);
      setStandings(data);
    } catch (err) {
      console.error('Failed to fetch standings:', err);
    }
  }, [id]);

  const fetchAll = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await fetchCompetition();
      // Fetch related data in parallel
      await Promise.all([fetchTeams(), fetchMatches(), fetchStandings()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch competition');
    } finally {
      setLoading(false);
    }
  }, [id, fetchCompetition, fetchTeams, fetchMatches, fetchStandings]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    competition,
    teams,
    matches,
    standings,
    loading,
    error,
    refetch: fetchAll,
    refetchTeams: fetchTeams,
    refetchMatches: fetchMatches,
    refetchStandings: fetchStandings,
  };
}
