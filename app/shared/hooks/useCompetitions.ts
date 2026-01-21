import { useState, useEffect, useCallback } from 'react';
import { Competition, CompetitionFormData, CompetitionFilters } from '../types';
import { competitionsApi } from '../api/services';

export function useCompetitions(initialFilters?: CompetitionFilters) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CompetitionFilters>(initialFilters || {});

  const fetchCompetitions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await competitionsApi.getAll(filters);
      setCompetitions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch competitions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  const createCompetition = async (data: CompetitionFormData) => {
    const newCompetition = await competitionsApi.create(data);
    setCompetitions((prev) => [...prev, newCompetition]);
    return newCompetition;
  };

  const updateCompetition = async (id: string, data: Partial<CompetitionFormData>) => {
    const updated = await competitionsApi.update(id, data);
    setCompetitions((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCompetition = async (id: string) => {
    await competitionsApi.delete(id);
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    competitions,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchCompetitions,
    createCompetition,
    updateCompetition,
    deleteCompetition,
  };
}
