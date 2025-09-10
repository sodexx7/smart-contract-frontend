import { useState, useEffect } from 'react';
import { ContractService, StreamData } from '../services/contract';

interface UseStreamsResult {
  streams: StreamData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStreams(): UseStreamsResult {
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching streams from contract...');
      
      const contractStreams = await ContractService.getAllStreams();
      console.log('Contract streams received:', contractStreams);
      
      setStreams(contractStreams);
    } catch (err) {
      console.error('Error in useStreams:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch streams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  return {
    streams,
    loading,
    error,
    refetch: fetchStreams
  };
}