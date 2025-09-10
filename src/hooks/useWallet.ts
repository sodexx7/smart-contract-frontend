import { useState, useEffect } from "react";
import { createWalletClient, custom, getAddress } from "viem";
import { mainnet, sepolia, polygon, arbitrum } from "viem/chains";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  error: string | null;
}

const SUPPORTED_CHAINS = {
  mainnet: mainnet,
  sepolia: sepolia, // Replacing Goerli with Sepolia (the current Ethereum testnet)
  polygon: polygon,
  arbitrum: arbitrum,
};

export function useWallet() {
  // Debug mode for testing without MetaMask
  const isDebugMode =
    !window.ethereum && window.location.hostname === "localhost";

  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    error: null,
  });

  const [selectedNetwork, setSelectedNetworkState] =
    useState<keyof typeof SUPPORTED_CHAINS>(() => {
      // Try to restore from localStorage, default to mainnet
      try {
        const saved = localStorage.getItem("selectedNetwork");
        return (saved && saved in SUPPORTED_CHAINS) ? saved as keyof typeof SUPPORTED_CHAINS : "mainnet";
      } catch {
        return "mainnet";
      }
    });

  // Wrapper function to also save to localStorage
  const setSelectedNetwork = (network: keyof typeof SUPPORTED_CHAINS) => {
    setSelectedNetworkState(network);
    try {
      localStorage.setItem("selectedNetwork", network);
    } catch (error) {
      console.warn("Failed to save selected network to localStorage:", error);
    }
  };

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({
            method: "eth_chainId",
          });
          const numericChainId = parseInt(chainId, 16);

          // Update selected network based on current chain
          const currentNetwork = Object.entries(SUPPORTED_CHAINS).find(
            ([, chain]) => chain.id === numericChainId
          );
          if (currentNetwork) {
            setSelectedNetwork(currentNetwork[0] as keyof typeof SUPPORTED_CHAINS);
          }

          setWalletState({
            address: getAddress(accounts[0]),
            isConnected: true,
            isConnecting: false,
            chainId: numericChainId,
            error: null,
          });
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
        setWalletState((prev) => ({
          ...prev,
          error: "Failed to check wallet connection",
        }));
      }
    }
  };

  const connectWallet = async () => {
    // Debug mode simulation
    if (isDebugMode) {
      setWalletState((prev) => ({ ...prev, isConnecting: true, error: null }));

      // Simulate connection delay
      setTimeout(async () => {
        // Try to get real address if MetaMask becomes available, otherwise use a realistic test address
        let testAddress = "0x742d35Cc6634C0532925a3b8D581C8F468c6b8E5"; // Realistic test address

        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({
              method: "eth_accounts",
            });
            if (accounts.length > 0) {
              testAddress = getAddress(accounts[0]);
            }
          } catch (error) {
            console.log("Using test address for debug mode");
          }
        }

        // Try to get the actual chainId if MetaMask is available
        let actualChainId = SUPPORTED_CHAINS[selectedNetwork].id; // Default to selected network

        if (window.ethereum) {
          try {
            const chainId = await window.ethereum.request({
              method: "eth_chainId",
            });
            actualChainId = parseInt(chainId, 16) as number;
          } catch (error) {
            console.log("Using selected network chainId for debug mode");
          }
        }

        console.log("Wallet connected! Address:", testAddress);
        setWalletState({
          address: testAddress,
          isConnected: true,
          isConnecting: false,
          chainId: actualChainId as number,
          error: null,
        });
      }, 1000);
      return;
    }

    if (typeof window.ethereum === "undefined") {
      setWalletState((prev) => ({
        ...prev,
        error:
          "MetaMask is not installed. Please install MetaMask and try again.",
      }));
      return;
    }

    setWalletState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        console.log("chainId:", parseInt(chainId, 16));

        const connectedAddress = getAddress(accounts[0]);
        console.log("Wallet connected! Address:", connectedAddress);
        setWalletState({
          address: connectedAddress,
          isConnected: true,
          isConnecting: false,
          chainId: parseInt(chainId, 16),
          error: null,
        });
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      let errorMessage = "Failed to connect wallet";

      if (error.code === 4001) {
        errorMessage = "User rejected the connection request";
      } else if (error.code === -32002) {
        errorMessage = "Connection request already pending";
      }

      setWalletState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  };

  const disconnectWallet = () => {
    setWalletState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      error: null,
    });
  };

  const switchNetwork = async (network: keyof typeof SUPPORTED_CHAINS) => {
    if (typeof window.ethereum === "undefined") {
      setWalletState((prev) => ({
        ...prev,
        error: "MetaMask is not installed",
      }));
      return;
    }

    const targetChain = SUPPORTED_CHAINS[network];
    const chainIdHex = `0x${targetChain.id.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });

      setSelectedNetwork(network);
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdHex,
                chainName: targetChain.name,
                rpcUrls: targetChain.rpcUrls.default.http,
                nativeCurrency: targetChain.nativeCurrency,
                blockExplorerUrls: targetChain.blockExplorers?.default
                  ? [targetChain.blockExplorers.default.url]
                  : undefined,
              },
            ],
          });
          setSelectedNetwork(network);
        } catch (addError) {
          console.error("Error adding chain:", addError);
          setWalletState((prev) => ({
            ...prev,
            error: "Failed to add network to wallet",
          }));
        }
      } else {
        console.error("Error switching network:", error);
        setWalletState((prev) => ({
          ...prev,
          error: "Failed to switch network",
        }));
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: number) => {
    const network = Object.entries(SUPPORTED_CHAINS).find(
      ([, chain]) => chain.id === chainId
    );
    return network ? network[0] : "Unknown";
  };

  useEffect(() => {
    checkConnection();

    if (typeof window.ethereum !== "undefined") {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletState((prev) => ({
            ...prev,
            address: getAddress(accounts[0]),
            isConnected: true,
            error: null,
          }));
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = (chainId: string) => {
        const numericChainId = parseInt(chainId, 16);
        
        // Update selected network based on new chain
        const currentNetwork = Object.entries(SUPPORTED_CHAINS).find(
          ([, chain]) => chain.id === numericChainId
        );
        if (currentNetwork) {
          setSelectedNetwork(currentNetwork[0] as keyof typeof SUPPORTED_CHAINS);
        }

        setWalletState((prev) => ({
          ...prev,
          chainId: numericChainId,
        }));
      };

      const handleDisconnect = () => {
        disconnectWallet();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
      window.ethereum.on("disconnect", handleDisconnect);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          window.ethereum.removeListener("chainChanged", handleChainChanged);
          window.ethereum.removeListener("disconnect", handleDisconnect);
        }
      };
    }
  }, []);

  return {
    ...walletState,
    selectedNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    formatAddress,
    getNetworkName,
    supportedNetworks: Object.keys(SUPPORTED_CHAINS) as Array<
      keyof typeof SUPPORTED_CHAINS
    >,
  };
}
