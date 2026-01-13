import { useState, useEffect, useCallback } from 'react';
import { Player } from '../types';
import { playersApi, PlayerFilters, PlayerFormData } from '../api/services';

export function usePlayers(initialFilters?: PlayerFilters) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlayerFilters>(initialFilters || {});

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await playersApi.getAll(filters);
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const updatePlayer = async (id: string, data: Partial<PlayerFormData>) => {
    const updated = await playersApi.update(id, data);
    setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  return {
    players,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchPlayers,
    updatePlayer,
  };
}
