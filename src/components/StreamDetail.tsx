import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { X, DollarSign, Pause, Plus, Eye, History, Play } from "lucide-react";

interface StreamDetailProps {
  stream: any;
  perspective: "sender" | "recipient";
  onClose: () => void;
}

export function StreamDetail({ stream, perspective, onClose }: StreamDetailProps) {
  if (!stream) return null;

  const getSenderContent = () => {
    const isCompleted = stream.completed || stream.status === "100% paid";
    const streamAmount = stream.streamed || stream.amount;
    const streamToken = stream.token;
    const claimedAmount = stream.claimed || "0";
    const availableAmount = stream.claimable || "0";
    
    // Format dates from stream data
    const startDate = stream.startTime ? new Date(stream.startTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Nov 1';
    const endDate = stream.endTime ? new Date(stream.endTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Jan 1';
    const cliffDate = stream.cliffTime && stream.cliffTime > stream.startTime ? new Date(stream.cliffTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    const hasCliff = stream.hasCliff || (stream.cliffTime && stream.cliffTime > stream.startTime);
    const progress = stream.progress || 0;
    
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
            <Badge variant="default" className={isCompleted ? "bg-emerald-500 text-white" : "bg-green-500 text-white"}>
              {isCompleted ? "COMPLETED" : "ACTIVE"} 
              <span className="ml-1">{isCompleted ? "✅" : "🟢"}</span>
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress:</span>
              <span>{stream.progress || 100}% ({streamAmount} {streamToken})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimed:</span>
              <span>{claimedAmount} {streamToken}</span>
            </div>
            {!isCompleted && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Claimable:</span>
                <span className="text-green-600">{stream.claimable || '0.00'} {streamToken}</span>
              </div>
            )}
          </div>
        </div>

        {/* Boost Details */}
        {stream.boost?.enabled && (
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              🚀 BOOST DETAILS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current APR:</span>
                <span className="text-purple-400">{stream.boost.rate}</span>
              </div>
              {!isCompleted ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projected earnings:</span>
                    <span>197 {streamToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk level:</span>
                    <span className="text-green-600">Low</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total earnings:</span>
                  <span className="text-green-600">{stream.earnings}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isCompleted ? (
            <>
              <Button className="w-full" size="sm">
                <DollarSign className="w-4 h-4 mr-2" />
                Claim {stream.claimable || availableAmount} {streamToken}
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Pause Stream
              </Button>
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
        </div>
      </>
    );
  };

  const getRecipientContent = () => {
    const isCompleted = stream.completed || stream.status === "100% clmd";
    const availableAmount = stream.claimable || stream.amount;
    const totalAmount = stream.total || stream.amount;
    const streamToken = stream.token;
    
    // Format dates from stream data
    const startDate = stream.startTime ? new Date(stream.startTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Nov 1';
    const endDate = stream.endTime ? new Date(stream.endTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Dec 25';
    const cliffDate = stream.cliffTime && stream.cliffTime > stream.startTime ? new Date(stream.cliffTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    const hasCliff = stream.hasCliff || (stream.cliffTime && stream.cliffTime > stream.startTime);
    const progress = stream.progress || 0;
    
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
            <Badge variant="default" className={isCompleted ? "bg-emerald-500 text-white" : "bg-green-500 text-white"}>
              {isCompleted ? "COMPLETED" : "ACTIVE"} 
              <span className="ml-1">{isCompleted ? "✅" : "🟢"}</span>
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress:</span>
              <span>{progress}% ({stream.streamed || availableAmount} {streamToken})</span>
            </div>
            {!isCompleted ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="text-green-600">{availableAmount} {streamToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span>1,000 {streamToken}</span>
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
          {!isCompleted ? (
            <>
              <Button className="w-full" size="sm">
                <DollarSign className="w-4 h-4 mr-2" />
                Claim {stream.claimable || availableAmount} {streamToken}
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Sender
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <History className="w-4 h-4 mr-2" />
                Stream History
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" size="sm">
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Sender
              </Button>
            </>
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