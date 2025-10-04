import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { X, DollarSign, Pause, Plus, Eye, History, Play, XCircle } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { ContractService } from "../services/contract";
import { useState, useEffect } from "react";

interface StreamDetailProps {
  stream: any;
  perspective: "sender" | "recipient";
  onClose: () => void;
  onStreamUpdate?: () => void;
}

const getExplorerUrl = (chainId: number, address: string) => {
  const explorers: { [key: number]: string } = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io", 
    8453: "https://basescan.org",
    137: "https://polygonscan.com",
    42161: "https://arbiscan.io"
  };
  
  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}/address/${address}` : null;
};

export function StreamDetail({ stream, perspective, onClose, onStreamUpdate }: StreamDetailProps) {
  if (!stream) return null;

  const { chainId, address: connectedAddress } = useWallet();
  const [isPausing, setIsPausing] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [localStreamStatus, setLocalStreamStatus] = useState(stream.status);
  const [contractOwner, setContractOwner] = useState<string | null>(null);

  // Fetch contract owner on component mount
  useEffect(() => {
    const fetchContractOwner = async () => {
      const owner = await ContractService.getOwner();
      setContractOwner(owner);
    };
    fetchContractOwner();
  }, []);

  const handleViewSender = () => {
    // Use fullSender for the full address and chainId from wallet
    if (stream.fullSender && chainId) {
      const explorerUrl = getExplorerUrl(chainId, stream.fullSender);
      if (explorerUrl) {
        window.open(explorerUrl, '_blank');
      }
    } else {
      console.log('Missing data:', { 
        fullSender: stream.fullSender, 
        chainId,
        stream: Object.keys(stream) 
      });
    }
  };

  const handlePauseStream = async () => {
    if (!stream.id) {
      setPauseError("Stream ID not found");
      return;
    }

    setIsPausing(true);
    setPauseError(null);

    try {
      const result = await ContractService.pauseStream(stream.id);
      
      if (result.success) {
        console.log("Stream paused successfully:", result.txHash);
        setLocalStreamStatus("paused");
        // Call parent callback to refresh stream data
        if (onStreamUpdate) {
          onStreamUpdate();
        }
        alert("Stream paused successfully! Transaction: " + result.txHash);
      } else {
        setPauseError(result.error || "Failed to pause stream");
      }
    } catch (error) {
      console.error("Error pausing stream:", error);
      setPauseError("An unexpected error occurred");
    } finally {
      setIsPausing(false);
    }
  };

  const handleCancelStream = async () => {
    if (!stream.id) {
      setCancelError("Stream ID not found");
      return;
    }

    setIsCanceling(true);
    setCancelError(null);

    try {
      const result = await ContractService.cancelStream(stream.id);
      
      if (result.success) {
        console.log("Stream canceled successfully:", result.txHash);
        setLocalStreamStatus("cancelled");
        // Call parent callback to refresh stream data
        if (onStreamUpdate) {
          onStreamUpdate();
        }
        alert("Stream canceled successfully! Transaction: " + result.txHash);
      } else {
        setCancelError(result.error || "Failed to cancel stream");
      }
    } catch (error) {
      console.error("Error canceling stream:", error);
      setCancelError("An unexpected error occurred");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleClaimStream = async () => {
    if (!stream.id) {
      setClaimError("Stream ID not found");
      return;
    }

    // Get the claimable amount from the stream data
    const claimableAmount = stream.claimableAmount || stream.claimable;
    if (!claimableAmount || parseFloat(claimableAmount) <= 0) {
      setClaimError("No tokens available to claim");
      return;
    }

    setIsClaiming(true);
    setClaimError(null);

    try {
      // Convert the claimable amount to the proper format for the contract
      const amountToClaim = ContractService.parseTokenAmount(claimableAmount.toString(), 6);
      const result = await ContractService.claimStream(stream.id, amountToClaim);
      
      if (result.success) {
        console.log("Stream claimed successfully:", result.txHash);
        // Call parent callback to refresh stream data
        if (onStreamUpdate) {
          onStreamUpdate();
        }
        alert(`Successfully claimed ${claimableAmount} USDC! Transaction: ${result.txHash}`);
      } else {
        setClaimError(result.error || "Failed to claim stream");
      }
    } catch (error) {
      console.error("Error claiming stream:", error);
      setClaimError("An unexpected error occurred");
    } finally {
      setIsClaiming(false);
    }
  };

  const getSenderContent = () => {
    const currentStatus = localStreamStatus || stream.status;
    const isCompleted = stream.completed || currentStatus === "completed";
    const isPaused = currentStatus === "paused";
    const isCancelled = currentStatus === "cancelled";
    const streamAmount = stream.streamed || stream.amount;
    const streamToken = stream.token;
    const claimedAmount = stream.claimed || "0";
    const availableAmount = stream.claimable || "0";
    const totalAmount = stream.total || stream.amount;
    
    // Calculate real progress: claimed amount / total amount * 100
    const realProgress = totalAmount && parseFloat(totalAmount) > 0 
      ? Math.round((parseFloat(claimedAmount) / parseFloat(totalAmount)) * 100)
      : 0;
    
    // Format dates from stream data
    const startDate = stream.startTime ? new Date(stream.startTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Nov 1';
    const endDate = stream.endTime ? new Date(stream.endTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Jan 1';
    const cliffDate = stream.cliffTime && stream.cliffTime > stream.startTime ? new Date(stream.cliffTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    const hasCliff = stream.hasCliff || (stream.cliffTime && stream.cliffTime > stream.startTime);
    const progress = realProgress;
    
    return (
      <>
        {/* Progress Timeline */}
        <div className="space-y-3">
          <h3 className="font-medium">Progress Timeline</h3>
          <div className="bg-muted/30 p-4 rounded-lg">
            {hasCliff ? (
              // Timeline with cliff
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Start</span>
                  <span>Cliff</span>
                  <span>End</span>
                </div>
                <div className="relative">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div className={`flex-1 h-0.5 mx-2 ${progress > 0 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${progress > 20 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                    <div className={`flex-1 h-0.5 mx-2 ${progress > 20 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${isCompleted || progress >= 100 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{startDate}</span>
                  <span>{cliffDate}</span>
                  <span>{endDate}</span>
                </div>
              </>
            ) : (
              // Simple timeline without cliff
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Start</span>
                  <span>End</span>
                </div>
                <div className="relative">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div className={`flex-1 h-0.5 mx-2 ${progress > 0 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${isCompleted || progress >= 100 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{startDate}</span>
                  <span>{endDate}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <Badge variant="default" className={
              isCompleted ? "bg-emerald-500 text-white" : 
              isPaused ? "bg-yellow-500 text-white" : 
              isCancelled ? "bg-red-500 text-white" :
              "bg-green-500 text-white"
            }>
              {isCompleted ? "COMPLETED" : isPaused ? "PAUSED" : isCancelled ? "CANCELLED" : "ACTIVE"} 
              <span className="ml-1">{isCompleted ? "✅" : isPaused ? "⏸️" : isCancelled ? "❌" : "🟢"}</span>
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress:</span>
              <span>{progress}% ({claimedAmount} {streamToken})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Streamed:</span>
              <span>{streamAmount} {streamToken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimed by recipient:</span>
              <span>{claimedAmount} {streamToken}</span>
            </div>
            {!isCompleted && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available to claim:</span>
                <span className="text-green-600">{availableAmount} {streamToken}</span>
              </div>
            )}
          </div>
        </div>


        {/* Action Buttons */}
        <div className="space-y-2">
          {!isCompleted && !isCancelled ? (
            <>
              {/* Pause button - only for stream sender */}
              {connectedAddress && stream.fullSender && 
               connectedAddress.toLowerCase() === stream.fullSender.toLowerCase() && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                  onClick={handlePauseStream}
                  disabled={isPausing || isPaused}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  {isPausing ? "Pausing..." : isPaused ? "Stream Paused" : "Pause Stream"}
                </Button>
              )}
              
              {/* Cancel button - only for contract owner */}
              {connectedAddress && contractOwner && 
               connectedAddress.toLowerCase() === contractOwner.toLowerCase() && (
                <Button 
                  variant="outline" 
                  className="w-full border-red-300 text-red-600 hover:bg-red-50" 
                  size="sm"
                  onClick={handleCancelStream}
                  disabled={isCanceling || isCancelled}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {isCanceling ? "Canceling..." : isCancelled ? "Stream Cancelled" : "Cancel Stream"}
                </Button>
              )}
              
              <Button variant="outline" className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Top Up
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" size="sm">
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Similar Stream
              </Button>
            </>
          )}
          
          {/* Error Display */}
          {pauseError && (
            <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">
              {pauseError}
            </div>
          )}
          {cancelError && (
            <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">
              {cancelError}
            </div>
          )}
        </div>
      </>
    );
  };

  const getRecipientContent = () => {
    const currentStatus = localStreamStatus || stream.status;
    const isCompleted = stream.completed || currentStatus === "completed";
    const isPaused = currentStatus === "paused";
    const isCancelled = currentStatus === "cancelled";
    const availableAmount = stream.claimable || stream.amount;
    const totalAmount = stream.total || stream.amount;
    const claimedAmount = stream.claimed || "0";
    const streamToken = stream.token;
    
    // Calculate real progress: claimed amount / total amount * 100
    const realProgress = totalAmount && parseFloat(totalAmount) > 0 
      ? Math.round((parseFloat(claimedAmount) / parseFloat(totalAmount)) * 100)
      : 0;
    
    // Format dates from stream data
    const startDate = stream.startTime ? new Date(stream.startTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Nov 1';
    const endDate = stream.endTime ? new Date(stream.endTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Dec 25';
    const cliffDate = stream.cliffTime && stream.cliffTime > stream.startTime ? new Date(stream.cliffTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    const hasCliff = stream.hasCliff || (stream.cliffTime && stream.cliffTime > stream.startTime);
    const progress = realProgress;
    
    return (
      <>
        {/* Progress Timeline */}
        <div className="space-y-3">
          <h3 className="font-medium">Progress Timeline</h3>
          <div className="bg-muted/30 p-4 rounded-lg">
            {hasCliff ? (
              // Timeline with cliff
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Start</span>
                  <span>Cliff</span>
                  <span>End</span>
                </div>
                <div className="relative">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div className={`flex-1 h-0.5 mx-2 ${progress > 0 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${progress > 20 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                    <div className={`flex-1 h-0.5 mx-2 ${progress > 20 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${isCompleted || progress >= 100 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{startDate}</span>
                  <span>{cliffDate}</span>
                  <span>{endDate}</span>
                </div>
              </>
            ) : (
              // Simple timeline without cliff
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Start</span>
                  <span>End</span>
                </div>
                <div className="relative">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div className={`flex-1 h-0.5 mx-2 ${progress > 0 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`w-3 h-3 rounded-full ${isCompleted || progress >= 100 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{startDate}</span>
                  <span>{endDate}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <Badge variant="default" className={
              isCompleted ? "bg-emerald-500 text-white" : 
              isPaused ? "bg-yellow-500 text-white" : 
              isCancelled ? "bg-red-500 text-white" :
              "bg-green-500 text-white"
            }>
              {isCompleted ? "COMPLETED" : isPaused ? "PAUSED" : isCancelled ? "CANCELLED" : "ACTIVE"} 
              <span className="ml-1">{isCompleted ? "✅" : isPaused ? "⏸️" : isCancelled ? "❌" : "🟢"}</span>
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress:</span>
              <span>{progress}% ({claimedAmount} {streamToken})</span>
            </div>
            {!isCompleted ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="text-green-600">{availableAmount} {streamToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span>{stream.remaining || "0.00"} {streamToken}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total received:</span>
                <span className="text-green-600">{totalAmount} {streamToken}</span>
              </div>
            )}
          </div>
        </div>

        {/* Earnings Details */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            💰 EARNINGS DETAILS
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base stream:</span>
              <span>{totalAmount} {streamToken}</span>
            </div>
            {stream.boost?.enabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boost earnings:</span>
                  <span className="text-purple-400">+340 {streamToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total earned:</span>
                  <span className="font-medium">{isCompleted ? stream.earnings : "4,340"} {streamToken}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isCompleted && !isCancelled ? (
            <>
              <Button 
                className="w-full" 
                size="sm"
                onClick={handleClaimStream}
                disabled={isClaiming || parseFloat(stream.claimable || availableAmount) <= 0}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {isClaiming ? "Claiming..." : `Claim ${stream.claimable || availableAmount} ${streamToken}`}
              </Button>
              <Button variant="outline" className="w-full" size="sm" onClick={handleViewSender}>
                <Eye className="w-4 h-4 mr-2" />
                View Sender
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" size="sm">
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
              <Button variant="outline" className="w-full" size="sm" onClick={handleViewSender}>
                <Eye className="w-4 h-4 mr-2" />
                View Sender
              </Button>
            </>
          )}
          
          {/* Error Display */}
          {claimError && (
            <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">
              {claimError}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">STREAM DETAIL</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">{stream.id}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {perspective === "sender" ? getSenderContent() : getRecipientContent()}
        </CardContent>
      </Card>
    </div>
  );
}