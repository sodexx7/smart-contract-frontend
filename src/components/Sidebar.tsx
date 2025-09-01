import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Plus, Send, Download, CheckCircle, AlertTriangle } from "lucide-react";

interface SidebarProps {
  onNavigateToCreateStream: () => void;
  onNavigateToTab: (tab: string) => void;
}

export function Sidebar({ onNavigateToCreateStream, onNavigateToTab }: SidebarProps) {
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
            <div 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              onClick={() => onNavigateToTab("outgoing")}
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Outgoing</span>
              </div>
              <Badge variant="secondary" className="text-xs">3</Badge>
            </div>
            
            <div 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              onClick={() => onNavigateToTab("incoming")}
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-green-500" />
                <span className="text-sm">Incoming</span>
              </div>
              <Badge variant="secondary" className="text-xs">2</Badge>
            </div>
            
            <div 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              onClick={() => onNavigateToTab("completed")}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Completed</span>
              </div>
              <Badge variant="secondary" className="text-xs">4</Badge>
            </div>
            
            <div 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              onClick={() => onNavigateToTab("pending")}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Pending Actions</span>
              </div>
              <Badge variant="destructive" className="text-xs">1</Badge>
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
              <span className="text-sm text-muted-foreground">Total Received:</span>
              <span className="font-medium">28.5K</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Claimable Now:</span>
              <span className="font-medium text-green-600">4.7K</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Senders:</span>
              <span className="font-medium">2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Boost Rewards:</span>
              <span className="font-medium text-blue-600">+892</span>
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
              <span className="font-medium">$125,000.42</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active:</span>
              <span className="font-medium">48 streams</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg APR:</span>
              <span className="font-medium text-green-600">6.7%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Duration:</span>
              <span className="font-medium">92d</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Update:</span>
              <span className="text-xs text-muted-foreground">2s ago</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}