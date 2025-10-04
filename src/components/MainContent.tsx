import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Pause, Play, Filter, TrendingUp, X, DollarSign, BarChart3, RotateCcw, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { useStreams } from "../hooks/useStreams";
import { useWallet } from "../hooks/useWallet";
import { ContractService, StreamStatus, getStatusVariant, getStatusColor } from "../services/contract";
import { useState } from "react";
import "../utils/contractTest"; // Import to run the test

interface MainContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onStreamClick: (stream: any, perspective: "sender" | "recipient") => void;
  refreshTrigger?: number;
  outgoingStatusFilter: string;
  incomingStatusFilter: string;
  onOutgoingStatusFilterChange: (status: string) => void;
  onIncomingStatusFilterChange: (status: string) => void;
}

export function MainContent({ 
  activeTab, 
  onTabChange, 
  onStreamClick, 
  refreshTrigger,
  outgoingStatusFilter,
  incomingStatusFilter,
  onOutgoingStatusFilterChange,
  onIncomingStatusFilterChange
}: MainContentProps) {
  const { streams, loading, error, contractOwner, refetch } = useStreams(refreshTrigger);
  const { address: connectedAddress } = useWallet();
  
  // Check if connected user is the contract owner
  const isContractOwner = connectedAddress && contractOwner && 
                         connectedAddress.toLowerCase() === contractOwner.toLowerCase();

  // Transform contract streams for display
  const transformStreamForDisplay = (stream: any) => {
    // USDC uses 6 decimals, not 18
    const totalFormatted = ContractService.formatTokenAmount(stream.totalAmount, 6);
    const claimedFormatted = ContractService.formatTokenAmount(stream.claimedAmount, 6);
    const claimableFormatted = ContractService.formatTokenAmount(stream.claimableAmount, 6);
    const remainingFormatted = ContractService.formatTokenAmount(stream.remainingAmount, 6);
    
    console.log('Stream data:', {
      id: stream.id,
      totalAmount: stream.totalAmount.toString(),
      totalFormatted,
      claimedAmount: stream.claimedAmount.toString(), 
      claimedFormatted,
      claimableAmount: stream.claimableAmount.toString(),
      claimableFormatted,
      remainingAmount: stream.remainingAmount.toString(),
      remainingFormatted
    });
    
    // Determine relationship type for owner
    let relationshipType = 'third-party';
    if (connectedAddress) {
      const isOwnerSender = stream.sender.toLowerCase() === connectedAddress.toLowerCase();
      const isOwnerRecipient = stream.recipient.toLowerCase() === connectedAddress.toLowerCase();
      
      if (isOwnerSender) {
        relationshipType = 'owner-sender';
      } else if (isOwnerRecipient) {
        relationshipType = 'owner-recipient';
      }
    }
    
    return {
      id: stream.id,
      sender: `${stream.sender.slice(0, 6)}...${stream.sender.slice(-4)}`,
      recipient: `${stream.recipient.slice(0, 6)}...${stream.recipient.slice(-4)}`,
      fullSender: stream.sender, // Keep full address for filtering
      fullRecipient: stream.recipient, // Keep full address for filtering
      relationshipType, // For owner view distinctions
      token: 'USDC', // Assume USDC for now
      rate: `${(parseFloat(totalFormatted) / ((stream.endTime - stream.startTime) / 86400)).toFixed(2)}/day`,
      total: parseFloat(totalFormatted).toFixed(2),
      streamed: (parseFloat(totalFormatted) * stream.progress / 100).toFixed(2),
      claimed: parseFloat(claimedFormatted).toFixed(2),
      claimable: parseFloat(claimableFormatted).toFixed(2),
      remaining: parseFloat(remainingFormatted).toFixed(2),
      progress: parseFloat(totalFormatted) > 0 
        ? Math.round((parseFloat(claimedFormatted) / parseFloat(totalFormatted)) * 100)
        : 0,
      status: stream.status,
      endDate: new Date(stream.endTime * 1000).toLocaleDateString(),
      daysLeft: ContractService.getTimeRemaining(stream.endTime),
      boost: { enabled: false, rate: "0%" },
      streamType: stream.status === 'active' ? 'base' : stream.status,
      hasCliff: stream.cliffTime > stream.startTime,
      cliffTime: stream.cliffTime,
      // Add raw timestamps for StreamDetail component
      startTime: stream.startTime,
      endTime: stream.endTime
    };
  };

  // Separate streams by direction based on connected wallet address
  const displayStreams = streams.map(transformStreamForDisplay);
  
  // Filter helper function
  const filterByStatus = (streams: any[], statusFilter: string) => {
    if (statusFilter === 'all') return streams;
    return streams.filter(stream => stream.status === statusFilter);
  };

  // Filter streams based on whether connected address is sender or recipient
  // If user is contract owner, show different views in each tab
  const allOutgoingStreams = displayStreams.filter(stream => {
    if (isContractOwner) {
      // Owner sees their own outgoing streams and all third-party streams in outgoing tab
      return stream.relationshipType === 'owner-sender' || stream.relationshipType === 'third-party';
    } else {
      // Regular users only see streams where they are sender
      return connectedAddress && 
             stream.fullSender.toLowerCase() === connectedAddress.toLowerCase();
    }
  });
  
  const allIncomingContractStreams = displayStreams.filter(stream => {
    if (isContractOwner) {
      // Owner sees their own incoming streams and all third-party streams in incoming tab
      return stream.relationshipType === 'owner-recipient' || stream.relationshipType === 'third-party';
    } else {
      // Regular users only see streams where they are recipient
      return connectedAddress && 
             stream.fullRecipient.toLowerCase() === connectedAddress.toLowerCase();
    }
  });

  // Apply status filtering
  const outgoingStreams = filterByStatus(allOutgoingStreams, outgoingStatusFilter);
  const incomingContractStreams = filterByStatus(allIncomingContractStreams, incomingStatusFilter);



  return (
    <main className="ml-[320px] mt-[72px] p-6 min-h-[calc(100vh-72px)]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Stream Dashboard</h1>
            <p className="text-muted-foreground">Manage your token streams and track payments</p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading streams...
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stream Management Tabs */}
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="flex gap-4 mb-6 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="outgoing" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-blue-50 data-[state=inactive]:hover:text-blue-700 data-[state=inactive]:hover:border-blue-300 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 cursor-pointer border-2 data-[state=inactive]:border-gray-200 shadow-sm hover:shadow-md"
            >
              <span className="mr-3 text-lg">📤</span>
              Outgoing Streams
            </TabsTrigger>
            <TabsTrigger 
              value="incoming" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-blue-50 data-[state=inactive]:hover:text-blue-700 data-[state=inactive]:hover:border-blue-300 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 cursor-pointer border-2 data-[state=inactive]:border-gray-200 shadow-sm hover:shadow-md"
            >
              <span className="mr-3 text-lg">📥</span>
              Incoming Streams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outgoing" className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">OUTGOING STREAMS ({outgoingStreams.length})</h2>
                {isContractOwner && (
                  <Badge variant="secondary" className="ml-2">
                    👑 Owner View
                  </Badge>
                )}
                {outgoingStreams.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {outgoingStreams.length} from contract
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={outgoingStatusFilter} onValueChange={onOutgoingStatusFilterChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="progress">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progress">Sort: Progress</SelectItem>
                    <SelectItem value="amount">Sort: Amount</SelectItem>
                    <SelectItem value="status">Sort: Status</SelectItem>
                    <SelectItem value="date">Sort: Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-2">Stream ID</div>
                  <div className="col-span-2">Recipient</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-3">Progress</div>
                  <div className="col-span-3">Status</div>
                </div>
              </div>
              
              <div className="divide-y">
                {/* Contract streams first */}
                {outgoingStreams.map((stream) => {
                  // Determine border color and badge based on relationship type
                  const getBorderColor = () => {
                    if (!isContractOwner) return 'border-l-green-500';
                    
                    switch (stream.relationshipType) {
                      case 'owner-sender':
                        return 'border-l-green-500';
                      case 'third-party':
                        return 'border-l-purple-500';
                      default:
                        return 'border-l-gray-500';
                    }
                  };
                  
                  const getBadgeInfo = () => {
                    if (!isContractOwner) {
                      return { text: 'Live Contract', className: 'text-green-600' };
                    }
                    
                    switch (stream.relationshipType) {
                      case 'owner-sender':
                        return { text: 'Your Stream', className: 'text-green-600' };
                      case 'third-party':
                        return { text: 'Third Party', className: 'text-purple-600' };
                      default:
                        return { text: 'Live Contract', className: 'text-gray-600' };
                    }
                  };
                  
                  const badgeInfo = getBadgeInfo();
                  
                  return (
                  <div key={stream.id} className={`px-4 py-3 hover:bg-muted/30 cursor-pointer border-l-4 ${getBorderColor()}`} onClick={() => onStreamClick(stream, "sender")}>
                    {/* Add a small indicator for contract streams */}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${badgeInfo.className}`}>
                        {badgeInfo.text}
                      </Badge>
                      {isContractOwner && stream.relationshipType === 'third-party' && (
                        <Badge variant="secondary" className="text-xs">
                          👁️ Owner View
                        </Badge>
                      )}
                    </div>
                    
                    {/* Main row */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <span className="font-medium text-sm">{stream.id}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-mono">{stream.recipient}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-medium">{stream.total} {stream.token}</span>
                      </div>
                      
                      <div className="col-span-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Progress value={stream.progress} className="h-2" />
                            </div>
                            <span className="text-sm font-medium min-w-[40px]">{stream.progress}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-3">
                        <Badge 
                          variant={getStatusVariant(stream.status as StreamStatus)}
                          className={`uppercase text-xs ${getStatusColor(stream.status as StreamStatus)}`}
                        >
                          {stream.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Sub row */}
                    <div className="grid grid-cols-12 gap-4 mt-1 text-xs text-muted-foreground">
                      <div className="col-span-2">
                        {stream.hasCliff ? (
                          <span className="flex items-center gap-1">
                            ⏰ <span>Has cliff</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            📊 <span>Base rate</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <span>{stream.daysLeft}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span>{stream.claimed} clmd</span>
                      </div>
                      
                      <div className="col-span-6"></div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="incoming" className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">INCOMING STREAMS ({incomingContractStreams.length})</h2>
                {isContractOwner && (
                  <Badge variant="secondary" className="ml-2">
                    👑 Owner View
                  </Badge>
                )}
                {incomingContractStreams.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {incomingContractStreams.length} from contract
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={incomingStatusFilter} onValueChange={onIncomingStatusFilterChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="progress">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progress">Sort: Progress</SelectItem>
                    <SelectItem value="amount">Sort: Amount</SelectItem>
                    <SelectItem value="status">Sort: Status</SelectItem>
                    <SelectItem value="date">Sort: Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-2">Stream ID</div>
                  <div className="col-span-2">From</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-3">Progress</div>
                  <div className="col-span-3">Status</div>
                </div>
              </div>
              
              <div className="divide-y">
                {/* Contract streams first */}
                {incomingContractStreams.map((stream) => {
                  // Determine border color and badge based on relationship type
                  const getBorderColor = () => {
                    if (!isContractOwner) return 'border-l-blue-500';
                    
                    switch (stream.relationshipType) {
                      case 'owner-recipient':
                        return 'border-l-blue-500';
                      case 'third-party':
                        return 'border-l-purple-500';
                      default:
                        return 'border-l-gray-500';
                    }
                  };
                  
                  const getBadgeInfo = () => {
                    if (!isContractOwner) {
                      return { text: 'Live Contract', className: 'text-blue-600' };
                    }
                    
                    switch (stream.relationshipType) {
                      case 'owner-recipient':
                        return { text: 'Your Stream', className: 'text-blue-600' };
                      case 'third-party':
                        return { text: 'Third Party', className: 'text-purple-600' };
                      default:
                        return { text: 'Live Contract', className: 'text-gray-600' };
                    }
                  };
                  
                  const badgeInfo = getBadgeInfo();
                  
                  return (
                  <div key={stream.id} className={`px-4 py-3 hover:bg-muted/30 cursor-pointer border-l-4 ${getBorderColor()}`} onClick={() => onStreamClick(stream, "recipient")}>
                    {/* Add a small indicator for contract streams */}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${badgeInfo.className}`}>
                        {badgeInfo.text}
                      </Badge>
                      {isContractOwner && stream.relationshipType === 'third-party' && (
                        <Badge variant="secondary" className="text-xs">
                          👁️ Owner View
                        </Badge>
                      )}
                    </div>
                    
                    {/* Main row */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <span className="font-medium text-sm">{stream.id}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-mono">{stream.sender}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-medium">{stream.total} {stream.token}</span>
                      </div>
                      
                      <div className="col-span-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Progress value={stream.progress} className="h-2" />
                            </div>
                            <span className="text-sm font-medium min-w-[40px]">{stream.progress}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-3">
                        <Badge 
                          variant={getStatusVariant(stream.status as StreamStatus)}
                          className={`uppercase text-xs ${getStatusColor(stream.status as StreamStatus)}`}
                        >
                          {stream.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Sub row */}
                    <div className="grid grid-cols-12 gap-4 mt-1 text-xs text-muted-foreground">
                      <div className="col-span-2">
                        {stream.hasCliff ? (
                          <span className="flex items-center gap-1">
                            ⏰ <span>Has cliff</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            📊 <span>Base rate</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <span>{stream.daysLeft}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span>{stream.claimable} claimable</span>
                      </div>
                      
                      <div className="col-span-6"></div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </main>
  );
}