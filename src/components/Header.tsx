import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ChevronDown, Sun, Moon, Wallet, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useWallet } from "../hooks/useWallet";
import { useStreams } from "../hooks/useStreams";
import { ContractService } from "../services/contract";

export function Header() {
  const { theme, setTheme } = useTheme();
  const {
    address,
    isConnected,
    isConnecting,
    selectedNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    formatAddress,
    error,
  } = useWallet();
  const { streams } = useStreams();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleNetworkChange = (value: string) => {
    switchNetwork(value as any);
  };

  // Calculate header stats
  const getHeaderStats = () => {
    // Calculate TVL (Total Value Locked) - sum of all stream total amounts
    const tvl = streams.reduce((total, stream) => {
      const totalFormatted = ContractService.formatTokenAmount(stream.totalAmount, 6);
      const amount = parseFloat(totalFormatted);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Count total streams
    const totalStreams = streams.length;

    // Calculate last update time for connected address's streams
    const userStreams = streams.filter(stream => 
      address && (
        stream.sender.toLowerCase() === address.toLowerCase() ||
        stream.recipient.toLowerCase() === address.toLowerCase()
      )
    );
    
    const lastUpdate = userStreams.length > 0 ? 
      Math.max(...userStreams.map(stream => stream.createdAt || 0)) : 0;
    
    const timeSinceUpdate = lastUpdate > 0 ? 
      Math.floor((Date.now() / 1000 - lastUpdate) / 60) : 0; // minutes ago
    
    const formatLastUpdate = (minutes: number) => {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };

    // Format TVL for display with proper number formatting
    const formatTVL = (amount: number) => {
      if (amount >= 1000000000) {
        return `$${(amount / 1000000000).toFixed(2)}B`;
      } else if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
      } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`;
      } else {
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    };

    return {
      tvl: formatTVL(tvl),
      totalStreams,
      lastUpdate: formatLastUpdate(timeSinceUpdate)
    };
  };

  const headerStats = getHeaderStats();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-background border-b border-border z-50">
        <div className="h-full flex items-center">
          {/* Logo - leftmost position */}
          <div className="w-[320px] px-6 flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <h1 className="text-xl font-medium">StreamBoost</h1>
          </div>

          {/* Main content area - aligned with stream list */}
          <div className="flex-1 max-w-6xl px-6 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>TVL: {headerStats.tvl}</span>
              <span>Streams: {headerStats.totalStreams}</span>
              <span>Last Update: {headerStats.lastUpdate}</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={toggleTheme}
                variant="outline"
                size="sm"
                className="rounded-full w-9 h-9 p-0"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              {isConnected && address && (
                <span className="text-sm bg-muted px-3 py-1 rounded-md">
                  {formatAddress(address)}
                </span>
              )}
              <Select
                value={selectedNetwork}
                onValueChange={handleNetworkChange}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mainnet">Network: Mainnet</SelectItem>
                  <SelectItem value="sepolia">Network: Sepolia</SelectItem>
                  <SelectItem value="polygon">Network: Polygon</SelectItem>
                  <SelectItem value="arbitrum">Network: Arbitrum</SelectItem>
                </SelectContent>
              </Select>
              {!isConnected ? (
                <Button
                  size="sm"
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={disconnectWallet}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      {error && (
        <div className="fixed top-[72px] left-0 right-0 bg-destructive text-destructive-foreground px-4 py-2 text-sm z-40">
          {error}
        </div>
      )}
    </>
  );
}
