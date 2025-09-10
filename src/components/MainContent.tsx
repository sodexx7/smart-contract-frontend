import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { MoreHorizontal, Pause, Play, StopCircle, Filter, ChevronDown, TrendingUp, X, DollarSign, BarChart3, RotateCcw, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { useStreams } from "../hooks/useStreams";
import { useWallet } from "../hooks/useWallet";
import { ContractService } from "../services/contract";
import "../utils/contractTest"; // Import to run the test

interface MainContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onStreamClick: (stream: any, perspective: "sender" | "recipient") => void;
}

export function MainContent({ activeTab, onTabChange, onStreamClick }: MainContentProps) {
  const { streams, loading, error, contractOwner, refetch } = useStreams();
  const { address: connectedAddress } = useWallet();
  
  // Check if connected user is the contract owner
  const isContractOwner = connectedAddress && contractOwner && 
                         connectedAddress.toLowerCase() === contractOwner.toLowerCase();

  // Transform contract streams for display
  const transformStreamForDisplay = (stream: any) => {
    const totalFormatted = ContractService.formatTokenAmount(stream.totalAmount);
    const claimedFormatted = ContractService.formatTokenAmount(stream.claimedAmount);
    const claimableFormatted = ContractService.formatTokenAmount(stream.claimableAmount);
    
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
      rate: `${(parseFloat(totalFormatted) / ((stream.endTime - stream.startTime) / 86400)).toFixed(0)}/day`,
      total: parseFloat(totalFormatted).toLocaleString(),
      streamed: (parseFloat(totalFormatted) * stream.progress / 100).toLocaleString(),
      claimed: claimedFormatted,
      claimable: claimableFormatted,
      remaining: (parseFloat(totalFormatted) - parseFloat(claimedFormatted)).toLocaleString(),
      progress: Math.round(stream.progress),
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
  
  // Filter streams based on whether connected address is sender or recipient
  // If user is contract owner, show different views in each tab
  const outgoingStreams = displayStreams.filter(stream => {
    if (isContractOwner) {
      // Owner sees their own outgoing streams and all third-party streams in outgoing tab
      return stream.relationshipType === 'owner-sender' || stream.relationshipType === 'third-party';
    } else {
      // Regular users only see streams where they are sender
      return connectedAddress && 
             stream.fullSender.toLowerCase() === connectedAddress.toLowerCase();
    }
  });
  
  const incomingContractStreams = displayStreams.filter(stream => {
    if (isContractOwner) {
      // Owner sees their own incoming streams and all third-party streams in incoming tab
      return stream.relationshipType === 'owner-recipient' || stream.relationshipType === 'third-party';
    } else {
      // Regular users only see streams where they are recipient
      return connectedAddress && 
             stream.fullRecipient.toLowerCase() === connectedAddress.toLowerCase();
    }
  });

  // Keep existing sample data for completed and pending
  const originalOutgoingStreams = [
    {
      id: "strm_01",
      recipient: "0xRec...Z",
      token: "USDC",
      rate: "100/day",
      total: "10,000",
      streamed: "2,500",
      claimed: "1,800",
      remaining: "7,500",
      progress: 25,
      status: "active",
      endDate: "Mar 15, 2024",
      daysLeft: "92d left",
      boost: { enabled: true, rate: "7.2%" },
      streamType: "boosted"
    },
    {
      id: "strm_02", 
      recipient: "0xRec...Y",
      token: "DAI",
      rate: "75/day",
      total: "5,000",
      streamed: "3,350",
      claimed: "3,400",
      remaining: "1,650",
      progress: 67,
      status: "active",
      endDate: "Feb 28, 2024",
      daysLeft: "34d left",
      boost: { enabled: false, rate: "0%" },
      streamType: "base"
    },
    {
      id: "strm_03",
      recipient: "0xRec...X", 
      token: "USDT",
      rate: "67/day",
      total: "2,000",
      streamed: "2,000",
      claimed: "0",
      remaining: "0",
      progress: 100,
      status: "paused",
      endDate: "Apr 30, 2024",
      daysLeft: "Cliff hit",
      boost: { enabled: false, rate: "0%" },
      streamType: "paused",
      pausedDays: "3d"
    }
  ];

  const incomingStreams = [
    {
      id: "strm_05",
      sender: "0xSnd...A",
      token: "USDC",
      rate: "83/day", 
      claimable: "4,000",
      total: "5,000",
      claimed: "4,000",
      progress: 80,
      status: "active",
      daysLeft: "6d left",
      boost: { enabled: true, rate: "6.8%" },
      streamType: "boosted"
    },
    {
      id: "strm_06",
      sender: "0xSnd...B",
      token: "DAI",
      rate: "182/day",
      claimable: "3,600",
      total: "8,000",
      claimed: "3,600",
      progress: 45,
      status: "active",
      daysLeft: "44d left",
      boost: { enabled: false, rate: "0%" },
      streamType: "base"
    }
  ];

  const completedStreams = [
    {
      id: "strm_07",
      party: "0xRec...W",
      token: "USDC",
      amount: "15K",
      completed: "Dec 1, 24",
      earnings: "+945 USDC",
      duration: "90d total",
      boost: { enabled: true, rate: "8.1%" },
      direction: "Outgoing",
      status: "100% paid"
    },
    {
      id: "strm_08", 
      party: "0xSnd...C",
      token: "DAI",
      amount: "12K",
      completed: "Nov 15, 24",
      earnings: "Base rate",
      duration: "85d total",
      boost: { enabled: false, rate: "0%" },
      direction: "Incoming",
      status: "100% clmd"
    },
    {
      id: "strm_09",
      party: "0xRec...V",
      token: "USDT", 
      amount: "8.5K",
      completed: "Oct 28, 24",
      earnings: "+422 USDC",
      duration: "78d total",
      boost: { enabled: true, rate: "6.5%" },
      direction: "Outgoing",
      status: "100% paid"
    },
    {
      id: "strm_10",
      party: "0xSnd...D",
      token: "USDC",
      amount: "6K", 
      completed: "Oct 10, 24",
      earnings: "+365 USDC",
      duration: "72d total",
      boost: { enabled: true, rate: "7.8%" },
      direction: "Incoming",
      status: "100% clmd"
    }
  ];

  const pendingActions = [
    {
      id: "action_01",
      actionType: "Low Balance",
      streamId: "strm_19",
      party: "0xRec...Q",
      details: "2K USDC",
      usage: "80% used",
      deadline: "3d remain",
      priority: "HIGH",
      priorityColor: "destructive" as const,
      description: "Fund Warning",
      action: "Auto-pause"
    }
  ];

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
          <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>

          <TabsContent value="outgoing" className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📤</span>
                <h2>OUTGOING STREAMS ({outgoingStreams.length + originalOutgoingStreams.length})</h2>
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
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
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
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Actions</div>
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
                      
                      <div className="col-span-2">
                        <Badge 
                          variant={stream.status === 'active' ? 'default' : stream.status === 'paused' ? 'secondary' : 'outline'}
                          className="uppercase text-xs"
                        >
                          {stream.status}
                        </Badge>
                      </div>
                      
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            {stream.status === 'active' ? (
                              <Pause className="w-4 h-4" />
                            ) : stream.status === 'paused' ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                        </div>
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
                
                {/* Sample streams with different styling */}
                {originalOutgoingStreams.map((stream) => (
                  <div key={stream.id} className="px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => onStreamClick(stream, "sender")}>
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
                      
                      <div className="col-span-2">
                        <Badge 
                          variant={stream.status === 'active' ? 'default' : stream.status === 'paused' ? 'secondary' : 'outline'}
                          className="uppercase text-xs"
                        >
                          {stream.status}
                        </Badge>
                      </div>
                      
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            {stream.status === 'active' ? (
                              <Pause className="w-4 h-4" />
                            ) : stream.status === 'paused' ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sub row */}
                    <div className="grid grid-cols-12 gap-4 mt-1 text-xs text-muted-foreground">
                      <div className="col-span-2">
                        {stream.boost.enabled ? (
                          <span className="flex items-center gap-1">
                            🚀 <span>Boosted {stream.boost.rate}</span>
                          </span>
                        ) : stream.status === 'paused' ? (
                          <span className="flex items-center gap-1">
                            ⚠️ <span>Paused {stream.pausedDays}</span>
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
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="incoming" className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📥</span>
                <h2>INCOMING STREAMS ({incomingStreams.length + incomingContractStreams.length})</h2>
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
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
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
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Actions</div>
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
                      
                      <div className="col-span-2">
                        <Badge 
                          variant={stream.status === 'active' ? 'default' : stream.status === 'paused' ? 'secondary' : 'outline'}
                          className="uppercase text-xs"
                        >
                          {stream.status}
                        </Badge>
                      </div>
                      
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </div>
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
                
                {/* Sample streams */}
                {incomingStreams.map((stream) => (
                  <div key={stream.id} className="px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => onStreamClick(stream, "recipient")}>
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
                      
                      <div className="col-span-2">
                        <Badge 
                          variant="default"
                          className="uppercase text-xs"
                        >
                          {stream.status}
                        </Badge>
                      </div>
                      
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sub row */}
                    <div className="grid grid-cols-12 gap-4 mt-1 text-xs text-muted-foreground">
                      <div className="col-span-2">
                        {stream.boost.enabled ? (
                          <span className="flex items-center gap-1">
                            🚀 <span>Boosted {stream.boost.rate}</span>
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
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <h2>COMPLETED STREAMS ({completedStreams.length})</h2>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="date">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort: Date</SelectItem>
                    <SelectItem value="amount">Sort: Amount</SelectItem>
                    <SelectItem value="earnings">Sort: Earnings</SelectItem>
                    <SelectItem value="duration">Sort: Duration</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
            
            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-2">Stream ID</div>
                  <div className="col-span-2">Party</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-2">Completed</div>
                  <div className="col-span-3">Earnings</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>
              
              <div className="divide-y">
                {completedStreams.map((stream) => (
                  <div key={stream.id} className="px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => onStreamClick(stream, stream.direction === "Outgoing" ? "sender" : "recipient")}>
                    {/* Main row */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <span className="font-medium text-sm">{stream.id}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-mono">{stream.party}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-medium">{stream.amount} {stream.token}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-medium">{stream.completed}</span>
                      </div>
                      
                      <div className="col-span-3">
                        <span className="text-sm font-medium text-green-600">{stream.earnings}</span>
                      </div>
                      
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            {stream.direction === "Outgoing" ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sub row */}
                    <div className="grid grid-cols-12 gap-4 mt-1 text-xs text-muted-foreground">
                      <div className="col-span-2">
                        {stream.boost.enabled ? (
                          <span className="flex items-center gap-1">
                            🚀 <span>Boosted {stream.boost.rate}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            📊 <span>Base rate</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <span>{stream.direction}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span>{stream.status}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span>{stream.duration}</span>
                      </div>
                      
                      <div className="col-span-3">
                        {stream.boost.enabled ? (
                          <span>{stream.boost.rate} APR</span>
                        ) : (
                          <span>0% boost</span>
                        )}
                      </div>
                      
                      <div className="col-span-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <h2>PENDING ACTIONS ({pendingActions.length})</h2>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="priority">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Sort: Priority</SelectItem>
                    <SelectItem value="deadline">Sort: Deadline</SelectItem>
                    <SelectItem value="stream">Sort: Stream</SelectItem>
                    <SelectItem value="type">Sort: Type</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
            
            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-2">Action Type</div>
                  <div className="col-span-2">Stream</div>
                  <div className="col-span-2">Details</div>
                  <div className="col-span-2">Deadline</div>
                  <div className="col-span-3">Priority</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>
              
              <div className="divide-y">
                {pendingActions.map((action) => (
                  <div key={action.id} className="px-4 py-3">
                    {/* Main row */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <span className="font-medium text-sm">{action.actionType}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-mono">{action.streamId}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-medium">{action.details}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm font-medium">{action.deadline}</span>
                      </div>
                      
                      <div className="col-span-3">
                        <Badge 
                          variant={action.priorityColor}
                          className="uppercase text-xs"
                        >
                          {action.priority}
                        </Badge>
                      </div>
                      
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <Pause className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sub row */}
                    <div className="grid grid-cols-12 gap-4 mt-1 text-xs text-muted-foreground">
                      <div className="col-span-2">
                        <span className="flex items-center gap-1">
                          ⚠️ <span>{action.description}</span>
                        </span>
                      </div>
                      
                      <div className="col-span-2">
                        <span>{action.party}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span>{action.usage}</span>
                      </div>
                      
                      <div className="col-span-2">
                        <span>{action.action}</span>
                      </div>
                      
                      <div className="col-span-3">
                        <span className="flex items-center gap-1">
                          🔴 <span>URGENT</span>
                        </span>
                      </div>
                      
                      <div className="col-span-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}