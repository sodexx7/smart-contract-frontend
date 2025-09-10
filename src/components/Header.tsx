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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleNetworkChange = (value: string) => {
    switchNetwork(value as any);
  };

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
              <span>TVL: $125K</span>
              <span>Streams: 48</span>
              <span>Avg APR: 6.7%</span>
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
