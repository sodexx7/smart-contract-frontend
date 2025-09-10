import { useState, useEffect } from 'react';
import { ContractService, StreamData } from '../services/contract';

interface UseStreamsResult {
  streams: StreamData[];
  loading: boolean;
  error: string | null;
  contractOwner: string | null;
  refetch: () => Promise<void>;
}

export function useStreams(): UseStreamsResult {
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractOwner, setContractOwner] = useState<string | null>(null);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching streams and owner from contract...');
      
      // Fetch both streams and contract owner in parallel
      const [contractStreams, owner] = await Promise.all([
        ContractService.getAllStreams(),
        ContractService.getOwner()
      ]);
      
      console.log('Contract streams received:', contractStreams);
      console.log('Contract owner:', owner);
      
      setStreams(contractStreams);
      setContractOwner(owner);
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
    contractOwner,
    refetch: fetchStreams
  };
}