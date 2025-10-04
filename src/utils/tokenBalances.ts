import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia, mainnet, polygon, arbitrum } from 'viem/chains';

// Network-specific token addresses
export const NETWORK_TOKEN_ADDRESSES = {
  // Sepolia testnet
  sepolia: {
    USDC: '0x2246008845d7385a7c5c9dacea09a36823fbcb88',
    WETH: '0x5ed3dd9c10a8e23664941bdb882e001c7ef11a45',
    USDT: '0x401e4b2cb20dc60c1e36802596e41d6c75579f29',
    BTC: '0xaeea408ffb5b7db38622455be2966aba1176fa32',
  },
  // Mainnet addresses (examples - would need real addresses)
  mainnet: {
    USDC: '0xA0b86a33E6441E6C296D4Ba30CA9b83bb653d17b', // Real USDC mainnet
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Real WETH mainnet
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Real USDT mainnet
    // BTC: Not applicable on mainnet (would be WBTC)
  },
  // Polygon addresses (examples)
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH on Polygon
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
  },
  // Arbitrum addresses (examples)
  arbitrum: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC on Arbitrum
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT on Arbitrum
  },
} as const;

// Token information (consistent across networks)
export const TOKEN_INFO = {
  USDC: { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  WETH: { symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  USDT: { symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  BTC: { symbol: 'BTC', decimals: 8, name: 'Bitcoin' },
} as const;

// Get supported chains
export const SUPPORTED_CHAINS = {
  mainnet,
  sepolia,
  polygon,
  arbitrum,
} as const;

// Get RPC URLs for different networks
export const NETWORK_RPC_URLS = {
  mainnet: 'https://ethereum-rpc.publicnode.com',
  sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
} as const;

// Get token addresses for a specific network
export function getTokenAddressesForNetwork(networkId: keyof typeof NETWORK_TOKEN_ADDRESSES) {
  return NETWORK_TOKEN_ADDRESSES[networkId] || {};
}

// Get network chain config
export function getChainConfig(networkId: keyof typeof SUPPORTED_CHAINS) {
  return SUPPORTED_CHAINS[networkId];
}

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

// Create a public client for a specific network
export function createNetworkClient(networkId: keyof typeof NETWORK_RPC_URLS) {
  const rpcUrl = NETWORK_RPC_URLS[networkId];
  const chain = getChainConfig(networkId);
  
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export async function getUserTokenBalances(userAddress: string, networkId: keyof typeof NETWORK_TOKEN_ADDRESSES = 'sepolia'): Promise<TokenBalance[]> {
  try {
    const tokenAddresses = getTokenAddressesForNetwork(networkId);
    const publicClient = createNetworkClient(networkId);
    
    if (Object.keys(tokenAddresses).length === 0) {
      console.warn(`No tokens configured for network: ${networkId}`);
      return [];
    }

    const balancePromises = Object.entries(tokenAddresses).map(async ([symbol, address]) => {
      try {
        const balance = await publicClient.readContract({
          address: address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        }) as bigint;

        const tokenInfo = TOKEN_INFO[symbol as keyof typeof TOKEN_INFO];
        const formattedBalance = formatUnits(balance, tokenInfo.decimals);

        return {
          address,
          symbol,
          balance: balance.toString(),
          formattedBalance,
        };
      } catch (error) {
        console.error(`Error fetching balance for ${symbol} on ${networkId}:`, error);
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
    console.error(`Error fetching token balances for network ${networkId}:`, error);
    return [];
  }
}