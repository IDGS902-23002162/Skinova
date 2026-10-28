import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../../shared/hooks/useApi';
import { createEvaluationApi } from '../services/evaluationApi';

export function useResultadosPiel() {
  const { fetchConAuth } = useApi();
  const evaluationApi = createEvaluationApi(fetchConAuth);

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await evaluationApi.getEvaluations();
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data || []);
      } else {
        setError("Error al cargar evaluaciones");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const handleCreateMock = async () => {
    try {
      setLoading(true);
      await evaluationApi.createMockEvaluation();
      await loadEvaluations();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    evaluations,
    loading,
    error,
    loadEvaluations,
    handleCreateMock
  };
}
