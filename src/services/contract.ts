import { createPublicClient, http, formatUnits } from "viem";
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
] as const;

// Create public client
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Stream status enum mapping
const STREAM_STATUS = {
  0: "active",
  1: "paused",
  2: "cancelled",
  3: "completed",
} as const;

export interface StreamData {
  id: string;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: bigint;
  claimedAmount: bigint;
  claimableAmount: bigint;
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
      // Get stream data and claimable amount in parallel
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

      return {
        id: stream.id,
        sender: stream.sender,
        recipient: stream.recipient,
        token: stream.token,
        totalAmount: stream.financials.totalAmount,
        claimedAmount: stream.financials.claimedAmount,
        claimableAmount,
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
}
