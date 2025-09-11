import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

// Token addresses from the deployed contracts
export const TOKEN_ADDRESSES = {
  USDC: '0x9814afb94bf47e3dbe1ba98fcb8171879462e31d',
  WETH: '0x5ed3dd9c10a8e23664941bdb882e001c7ef11a45',
  USDT: '0x401e4b2cb20dc60c1e36802596e41d6c75579f29',
  BTC: '0xaeea408ffb5b7db38622455be2966aba1176fa32',
} as const;

export const TOKEN_INFO = {
  [TOKEN_ADDRESSES.USDC]: { symbol: 'USDC', decimals: 6, name: 'Mock USD Coin' },
  [TOKEN_ADDRESSES.WETH]: { symbol: 'WETH', decimals: 18, name: 'Mock Wrapped Ether' },
  [TOKEN_ADDRESSES.USDT]: { symbol: 'USDT', decimals: 6, name: 'Mock Tether USD' },
  [TOKEN_ADDRESSES.BTC]: { symbol: 'BTC', decimals: 8, name: 'Mock Bitcoin' },
} as const;

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

export interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  formattedBalance: string;
}

// Minimum balance required for tokens to be shown (in token units)
export const MINIMUM_BALANCE_THRESHOLD = 1000;

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
});

export async function getUserTokenBalances(userAddress: string): Promise<TokenBalance[]> {
  try {
    const balancePromises = Object.entries(TOKEN_ADDRESSES).map(async ([symbol, address]) => {
      try {
        const balance = await publicClient.readContract({
          address: address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        }) as bigint;

        const tokenInfo = TOKEN_INFO[address];
        const formattedBalance = formatUnits(balance, tokenInfo.decimals);

        return {
          address,
          symbol,
          balance: balance.toString(),
          formattedBalance,
        };
      } catch (error) {
        console.error(`Error fetching balance for ${symbol}:`, error);
        return {
          address,
          symbol,
          balance: '0',
          formattedBalance: '0.00',
        };
      }
    });

    const balances = await Promise.all(balancePromises);
    
    // Only return tokens with balances >= minimum threshold
    return balances.filter(token => parseFloat(token.formattedBalance) >= MINIMUM_BALANCE_THRESHOLD);
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return [];
  }
}