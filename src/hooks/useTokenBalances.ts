import { useState, useEffect } from 'react';
import { getUserTokenBalances, TokenBalance, NETWORK_TOKEN_ADDRESSES } from '../utils/tokenBalances';
import { useWallet } from './useWallet';

export function useTokenBalances(userAddress: string | null) {
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedNetwork } = useWallet();

  useEffect(() => {
    if (!userAddress || !selectedNetwork) {
      setTokenBalances([]);
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      setError(null);

      try {
        // Map wallet network names to our network config
        const networkMap: { [key: string]: keyof typeof NETWORK_TOKEN_ADDRESSES } = {
          'mainnet': 'mainnet',
          'sepolia': 'sepolia',
          'polygon': 'polygon',
          'arbitrum': 'arbitrum',
        };

        const networkId = networkMap[selectedNetwork] || 'sepolia';
        console.log(`Fetching token balances for network: ${networkId}`);
        
        const balances = await getUserTokenBalances(userAddress, networkId);
        setTokenBalances(balances);
      } catch (err) {
        console.error('Error fetching token balances:', err);
        setError('Failed to fetch token balances');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [userAddress, selectedNetwork]);

  const refetch = () => {
    if (userAddress && selectedNetwork) {
      setLoading(true);
      const networkMap: { [key: string]: keyof typeof NETWORK_TOKEN_ADDRESSES } = {
        'mainnet': 'mainnet',
        'sepolia': 'sepolia',
        'polygon': 'polygon',
        'arbitrum': 'arbitrum',
      };
      const networkId = networkMap[selectedNetwork] || 'sepolia';
      getUserTokenBalances(userAddress, networkId).then(setTokenBalances).finally(() => setLoading(false));
    }
  };

  return { tokenBalances, loading, error, refetch };
}