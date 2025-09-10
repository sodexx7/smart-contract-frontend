// Quick test to verify contract connection
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const CONTRACT_ADDRESS = "0xcc2149eeca0b6bb7228e7a651987ebb064276463" as const;

// Create client
const client = createPublicClient({
  chain: sepolia,
  transport: http("https://sepolia.drpc.org"),
});

export async function testContractConnection() {
  try {
    // Try to get the contract's bytecode to verify it exists
    const bytecode = await client.getCode({
      address: CONTRACT_ADDRESS,
    });

    console.log("Contract exists:", bytecode ? "Yes" : "No");
    console.log("Bytecode length:", bytecode ? bytecode.length : 0);

    return bytecode !== undefined && bytecode !== "0x";
  } catch (error) {
    console.error("Contract test failed:", error);
    return false;
  }
}

// Test the contract on import
testContractConnection().then((exists) => {
  console.log("Contract deployment verified:", exists);
});
