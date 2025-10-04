import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Plus, Send, Download, CheckCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useStreams } from "../hooks/useStreams";
import { useWallet } from "../hooks/useWallet";
import { ContractService } from "../services/contract";
import { useState } from "react";

interface SidebarProps {
  onNavigateToCreateStream: () => void;
  onNavigateToTab: (tab: string) => void;
  onStatusFilter: (streamType: 'outgoing' | 'incoming', status: string) => void;
}

export function Sidebar({ onNavigateToCreateStream, onNavigateToTab, onStatusFilter }: SidebarProps) {
  const { streams } = useStreams();
  const { address: connectedAddress } = useWallet();
  const [expandedOutgoing, setExpandedOutgoing] = useState(false);
  const [expandedIncoming, setExpandedIncoming] = useState(false);

  // Helper function to transform and filter streams for display
  const getFilteredStreams = () => {
    if (!connectedAddress) return { outgoingStreams: [], incomingStreams: [] };

    const outgoingStreams = streams.filter(stream => 
      stream.sender.toLowerCase() === connectedAddress.toLowerCase()
    );
    
    const incomingStreams = streams.filter(stream => 
      stream.recipient.toLowerCase() === connectedAddress.toLowerCase()
    );

    return { outgoingStreams, incomingStreams };
  };

  // Helper function to count streams by status
  const countStreamsByStatus = (streamList: any[]) => {
    const counts = {
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0
    };

    streamList.forEach(stream => {
      const status = stream.status.toLowerCase();
      if (counts.hasOwnProperty(status)) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const { outgoingStreams, incomingStreams } = getFilteredStreams();
  const outgoingCounts = countStreamsByStatus(outgoingStreams);
  const incomingCounts = countStreamsByStatus(incomingStreams);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Calculate recipient summary data
  const getRecipientSummary = () => {
    if (!connectedAddress) {
      return {
        availableReceived: '0.00',
        claimableNow: '0.00',
        activeSenders: 0
      };
    }

    // Get incoming streams where connected address is recipient
    const myIncomingStreams = streams.filter(stream => 
      stream.recipient.toLowerCase() === connectedAddress.toLowerCase()
    );

    // Calculate total available received (total of all incoming streams)
    const availableReceived = myIncomingStreams.reduce((total, stream) => {
      // Use formatted amounts from contract service (USDC uses 6 decimals)
      const totalFormatted = ContractService.formatTokenAmount(stream.totalAmount, 6);
      const amount = parseFloat(totalFormatted);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Calculate total claimable now
    const claimableNow = myIncomingStreams.reduce((total, stream) => {
      // Use formatted amounts from contract service (USDC uses 6 decimals)
      const claimableFormatted = ContractService.formatTokenAmount(stream.claimableAmount, 6);
      const amount = parseFloat(claimableFormatted);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Calculate active senders (unique senders from active streams)
    const activeSenders = new Set(
      myIncomingStreams
        .filter(stream => stream.status.toLowerCase() === 'active')
        .map(stream => stream.sender.toLowerCase())
    ).size;

    // Format amounts for display
    const formatAmount = (amount: number) => {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
      } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`;
      } else {
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    };

    return {
      availableReceived: formatAmount(availableReceived),
      claimableNow: formatAmount(claimableNow),
      activeSenders
    };
  };

  const recipientSummary = getRecipientSummary();

  // Calculate protocol stats from all streams
  const getProtocolStats = () => {
    // Calculate TVL (Total Value Locked) - sum of all stream total amounts
    const tvl = streams.reduce((total, stream) => {
      const totalFormatted = ContractService.formatTokenAmount(stream.totalAmount, 6);
      const amount = parseFloat(totalFormatted);
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Count active streams
    const activeStreams = streams.filter(stream => 
      stream.status.toLowerCase() === 'active'
    ).length;

    // Calculate average duration of all streams (in days)
    const totalDuration = streams.reduce((total, stream) => {
      const durationSeconds = stream.endTime - stream.startTime;
      const durationDays = durationSeconds / (24 * 60 * 60); // Convert to days
      return total + durationDays;
    }, 0);
    const avgDuration = streams.length > 0 ? Math.round(totalDuration / streams.length) : 0;

    // Calculate last update time for connected address's streams
    const userStreams = streams.filter(stream => 
      connectedAddress && (
        stream.sender.toLowerCase() === connectedAddress.toLowerCase() ||
        stream.recipient.toLowerCase() === connectedAddress.toLowerCase()
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

    // Format TVL for sidebar display
    const formatSidebarTVL = (amount: number) => {
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
      tvl: formatSidebarTVL(tvl),
      activeStreams,
      avgDuration,
      lastUpdate: formatLastUpdate(timeSinceUpdate)
    };
  };

  const protocolStats = getProtocolStats();

  return (
    <aside className="fixed left-0 top-[72px] w-[320px] h-[calc(100vh-72px)] bg-background border-r border-border overflow-y-auto p-4">
      <div className="space-y-6">
        {/* Create Stream Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Create Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="sm" onClick={onNavigateToCreateStream}>
              <Plus className="w-4 h-4 mr-2" />
              New Stream
            </Button>
          </CardContent>
        </Card>

        {/* My Streams Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              My Streams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Outgoing Streams */}
            <div className="space-y-1">
              <div 
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  setExpandedOutgoing(!expandedOutgoing);
                  onNavigateToTab("outgoing");
                }}
              >
                <div className="flex items-center gap-2">
                  {expandedOutgoing ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Send className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Outgoing</span>
                </div>
                <Badge variant="secondary" className="text-xs">{outgoingStreams.length}</Badge>
              </div>
              
              {expandedOutgoing && (
                <div className="ml-6 space-y-1">
                  {Object.entries(outgoingCounts).map(([status, count]) => 
                    count > 0 && (
                      <div 
                        key={status} 
                        className="flex items-center justify-between py-1 px-2 text-xs hover:bg-muted/30 rounded cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusFilter('outgoing', status);
                        }}
                      >
                        <span className="capitalize text-muted-foreground">{status}</span>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(status)} border-0`}>
                          {count}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            
            {/* Incoming Streams */}
            <div className="space-y-1">
              <div 
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  setExpandedIncoming(!expandedIncoming);
                  onNavigateToTab("incoming");
                }}
              >
                <div className="flex items-center gap-2">
                  {expandedIncoming ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Download className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Incoming</span>
                </div>
                <Badge variant="secondary" className="text-xs">{incomingStreams.length}</Badge>
              </div>
              
              {expandedIncoming && (
                <div className="ml-6 space-y-1">
                  {Object.entries(incomingCounts).map(([status, count]) => 
                    count > 0 && (
                      <div 
                        key={status} 
                        className="flex items-center justify-between py-1 px-2 text-xs hover:bg-muted/30 rounded cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusFilter('incoming', status);
                        }}
                      >
                        <span className="capitalize text-muted-foreground">{status}</span>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(status)} border-0`}>
                          {count}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipient Summary Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Recipient Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available Received:</span>
              <span className="font-medium">{recipientSummary.availableReceived}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Claimable Now:</span>
              <span className="font-medium text-green-600">{recipientSummary.claimableNow}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Senders:</span>
              <span className="font-medium">{recipientSummary.activeSenders}</span>
            </div>
          </CardContent>
        </Card>

        {/* Protocol Stats Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Protocol Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">TVL:</span>
              <span className="font-medium">{protocolStats.tvl}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active:</span>
              <span className="font-medium">{protocolStats.activeStreams} streams</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Duration:</span>
              <span className="font-medium">{protocolStats.avgDuration}d</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Update:</span>
              <span className="text-xs text-muted-foreground">{protocolStats.lastUpdate}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}