import { createPublicClient, createWalletClient, http, formatUnits, custom } from "viem";
import { sepolia } from "viem/chains";

// Contract configuration
const CONTRACT_ADDRESS = "0xcc2149eeca0b6bb7228e7a651987ebb064276463" as const;
const RPC_URL = "https://sepolia.drpc.org"; // Public Sepolia RPC endpoint

// Contract ABI (only the functions we need)
const CONTRACT_ABI = [
  {
    type: "function",
    name: "getAllStreamIds",
    inputs: [],
    outputs: [{ name: "", type: "string[]", internalType: "string[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getStream",
    inputs: [{ name: "_streamId", type: "string", internalType: "string" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct StreamBoost.Stream",
        components: [
          { name: "id", type: "string", internalType: "string" },
          { name: "sender", type: "address", internalType: "address" },
          { name: "recipient", type: "address", internalType: "address" },
          { name: "token", type: "address", internalType: "address" },
          {
            name: "timing",
            type: "tuple",
            internalType: "struct StreamBoost.StreamTiming",
            components: [
              { name: "startTime", type: "uint256", internalType: "uint256" },
              { name: "endTime", type: "uint256", internalType: "uint256" },
              { name: "cliffTime", type: "uint256", internalType: "uint256" },
              { name: "createdAt", type: "uint256", internalType: "uint256" },
              { name: "pausedAt", type: "uint256", internalType: "uint256" },
            ],
          },
          {
            name: "financials",
            type: "tuple",
            internalType: "struct StreamBoost.StreamFinancials",
            components: [
              { name: "totalAmount", type: "uint256", internalType: "uint256" },
              {
                name: "claimedAmount",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          {
            name: "status",
            type: "uint8",
            internalType: "enum StreamBoost.StreamStatus",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getClaimableAmount",
    inputs: [{ name: "_streamId", type: "string", internalType: "string" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getStreamProgress",
    inputs: [{ name: "_streamId", type: "string", internalType: "string" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pauseStream",
    inputs: [{ name: "_streamId", type: "string", internalType: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mockSimulateStreamFailure",
    inputs: [{ name: "_streamId", type: "string", internalType: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimStream",
    inputs: [
      { name: "_streamId", type: "string", internalType: "string" },
      { name: "_amount", type: "uint256", internalType: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Create public client
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Enhanced stream status enum mapping
const STREAM_STATUS = {
  1: "active",
  2: "paused",
  3: "completed",
  4: "cancelled",
} as const;

// Stream status type
export type StreamStatus = 'active' | 'paused' | 'completed' | 'cancelled';

// Stream direction type  
export type StreamDirection = 'outgoing' | 'incoming';

// Helper to determine stream direction based on user address
export const getStreamDirection = (userAddress: string, stream: { sender: string; recipient: string }): StreamDirection => {
  return userAddress.toLowerCase() === stream.sender.toLowerCase() ? 'outgoing' : 'incoming';
};

// Status display helpers
export const getStatusVariant = (status: StreamStatus) => {
  switch (status) {
    case 'active': return 'default';
    case 'paused': return 'secondary'; 
    case 'completed': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

export const getStatusColor = (status: StreamStatus) => {
  switch (status) {
    case 'active': return 'text-green-600';
    case 'paused': return 'text-yellow-600';
    case 'completed': return 'text-blue-600';
    case 'cancelled': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export interface StreamData {
  id: string;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: bigint;
  claimedAmount: bigint;
  claimableAmount: bigint;
  remainingAmount: bigint;
  progress: number;
  status: string;
  startTime: number;
  endTime: number;
  cliffTime: number;
  createdAt: number;
}

export class ContractService {
  /**
   * Get the contract owner address
   */
  static async getOwner(): Promise<string | null> {
    try {
      console.log("Fetching contract owner from:", CONTRACT_ADDRESS);
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "owner",
      });
      console.log("Contract owner:", result);
      return result as string;
    } catch (error) {
      console.error("Error fetching contract owner:", error);
      return null;
    }
  }

  /**
   * Get all stream IDs from the contract
   */
  static async getAllStreamIds(): Promise<string[]> {
    try {
      console.log("Fetching stream IDs from contract:", CONTRACT_ADDRESS);
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getAllStreamIds",
      });
      console.log("getAllStreamIds result:", result);
      return result as string[];
    } catch (error) {
      console.error("Error fetching stream IDs:", error);
      return [];
    }
  }

  /**
   * Get detailed information for a specific stream
   */
  static async getStream(streamId: string): Promise<StreamData | null> {
    try {
      // Get stream data, claimable amount, and progress in parallel
      const [streamResult, claimableResult, progressResult] = await Promise.all(
        [
          publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getStream",
            args: [streamId],
          }),
          publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getClaimableAmount",
            args: [streamId],
          }),
          publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getStreamProgress",
            args: [streamId],
          }),
        ]
      );

      const stream = streamResult;
      const claimableAmount = claimableResult;
      const progress = Number(progressResult) / 100; // Convert from basis points to percentage
      
      // Calculate remaining amount: totalAmount - claimedAmount - claimableAmount
      const remainingAmount = stream.financials.totalAmount - stream.financials.claimedAmount - claimableAmount;

      return {
        id: stream.id,
        sender: stream.sender,
        recipient: stream.recipient,
        token: stream.token,
        totalAmount: stream.financials.totalAmount,
        claimedAmount: stream.financials.claimedAmount,
        claimableAmount,
        remainingAmount,
        progress,
        status:
          STREAM_STATUS[stream.status as keyof typeof STREAM_STATUS] ||
          "unknown",
        startTime: Number(stream.timing.startTime),
        endTime: Number(stream.timing.endTime),
        cliffTime: Number(stream.timing.cliffTime),
        createdAt: Number(stream.timing.createdAt),
      };
    } catch (error) {
      console.error(`Error fetching stream ${streamId}:`, error);
      return null;
    }
  }

  /**
   * Get all streams with their detailed information
   */
  static async getAllStreams(): Promise<StreamData[]> {
    try {
      const streamIds = await this.getAllStreamIds();
      console.log("Found stream IDs:", streamIds);

      if (streamIds.length === 0) {
        return [];
      }

      // Get detailed info for all streams
      const streams = await Promise.all(
        streamIds.map((id) => this.getStream(id))
      );

      return streams.filter((stream): stream is StreamData => stream !== null);
    } catch (error) {
      console.error("Error fetching all streams:", error);
      return [];
    }
  }

  /**
   * Format token amount for display (assuming 18 decimals for now)
   */
  static formatTokenAmount(amount: bigint, decimals: number = 18): string {
    return formatUnits(amount, decimals);
  }

  /**
   * Calculate time remaining in days
   */
  static getTimeRemaining(endTime: number): string {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
      return "Ended";
    }

    const days = Math.floor(timeLeft / (24 * 3600));
    if (days > 0) {
      return `${days}d left`;
    }

    const hours = Math.floor(timeLeft / 3600);
    if (hours > 0) {
      return `${hours}h left`;
    }

    const minutes = Math.floor(timeLeft / 60);
    return `${minutes}m left`;
  }

  /**
   * Pause a stream
   */
  static async pauseStream(streamId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        return { success: false, error: "Wallet not found. Please install MetaMask or another wallet." };
      }

      // Create wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      });

      // Get the connected account
      const [account] = await walletClient.getAddresses();
      if (!account) {
        return { success: false, error: "No account connected. Please connect your wallet." };
      }

      // Execute the pauseStream transaction
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "pauseStream",
        args: [streamId],
        account,
      });

      console.log("Pause stream transaction hash:", hash);
      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error pausing stream:", error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          return { success: false, error: "Transaction was rejected by user." };
        }
        if (error.message.includes("insufficient funds")) {
          return { success: false, error: "Insufficient funds for transaction." };
        }
        return { success: false, error: error.message };
      }
      
      return { success: false, error: "An unknown error occurred while pausing the stream." };
    }
  }

  /**
   * Cancel a stream
   */
  static async cancelStream(streamId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        return { success: false, error: "Wallet not found. Please install MetaMask or another wallet." };
      }

      // Create wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      });

      // Get the connected account
      const [account] = await walletClient.getAddresses();
      if (!account) {
        return { success: false, error: "No account connected. Please connect your wallet." };
      }

      // Execute the mockSimulateStreamFailure transaction (which cancels the stream)
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "mockSimulateStreamFailure",
        args: [streamId],
        account,
      });

      console.log("Cancel stream transaction hash:", hash);
      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error canceling stream:", error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          return { success: false, error: "Transaction was rejected by user." };
        }
        if (error.message.includes("insufficient funds")) {
          return { success: false, error: "Insufficient funds for transaction." };
        }
        return { success: false, error: error.message };
      }
      
      return { success: false, error: "An unknown error occurred while canceling the stream." };
    }
  }

  /**
   * Claim tokens from a stream
   */
  static async claimStream(streamId: string, amount: bigint): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        return { success: false, error: "Wallet not found. Please install MetaMask or another wallet." };
      }

      // Create wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      });

      // Get the connected account
      const [account] = await walletClient.getAddresses();
      if (!account) {
        return { success: false, error: "No account connected. Please connect your wallet." };
      }

      // Execute the claimStream transaction
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "claimStream",
        args: [streamId, amount],
        account,
      });

      console.log("Claim stream transaction hash:", hash);
      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error claiming stream:", error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          return { success: false, error: "Transaction was rejected by user." };
        }
        if (error.message.includes("insufficient funds")) {
          return { success: false, error: "Insufficient funds for transaction." };
        }
        return { success: false, error: error.message };
      }
      
      return { success: false, error: "An unknown error occurred while claiming the stream." };
    }
  }

  /**
   * Parse token amount for contract (convert from decimal to wei-like units)
   */
  static parseTokenAmount(amount: string, decimals: number = 6): bigint {
    // Convert string amount to bigint with proper decimals
    const factor = BigInt(10 ** decimals);
    const [whole, decimal = ''] = amount.split('.');
    const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole) * factor + BigInt(paddedDecimal);
  }
}
