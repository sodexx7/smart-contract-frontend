import { useState, useEffect } from 'react';
import { getUserTokenBalances, TokenBalance } from '../utils/tokenBalances';

export function useTokenBalances(userAddress: string | null) {
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setTokenBalances([]);
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      setError(null);

      try {
        const balances = await getUserTokenBalances(userAddress);
        setTokenBalances(balances);
      } catch (err) {
        console.error('Error fetching token balances:', err);
        setError('Failed to fetch token balances');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [userAddress]);

  return { tokenBalances, loading, error, refetch: () => {
    if (userAddress) {
      setLoading(true);
      getUserTokenBalances(userAddress).then(setTokenBalances).finally(() => setLoading(false));
    }
  }};
}