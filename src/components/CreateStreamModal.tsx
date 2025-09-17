import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { X, ArrowLeft, ArrowRight, Wallet, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { createWalletClient, custom, parseUnits } from "viem";
import { sepolia } from "viem/chains";

// Contract configuration
const CONTRACT_ADDRESS = "0xcc2149eeca0b6bb7228e7a651987ebb064276463" as const;

// ERC20 approve ABI
const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" }
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" }
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  }
] as const;

// createStream ABI
const CREATE_STREAM_ABI = [
  {
    type: "function",
    name: "createStream",
    inputs: [
      { name: "_id", type: "string", internalType: "string" },
      { name: "_recipient", type: "address", internalType: "address" },
      { name: "_token", type: "address", internalType: "address" },
      { name: "_totalAmount", type: "uint256", internalType: "uint256" },
      { name: "_duration", type: "uint256", internalType: "uint256" },
      { name: "_cliffDuration", type: "uint256", internalType: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;
import { useTokenBalances } from "../hooks/useTokenBalances";
import { formatBalance } from "../utils/formatBalance";
import { MINIMUM_BALANCE_THRESHOLD } from "../utils/tokenBalances";

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

interface FormData {
  name: string;
  token: string;
  recipient: string;
  amount: string;
  duration: string;
  enableCliff: boolean;
  cliffDays: string;
  startTime: "now" | "custom";
  customDate: string;
  customTime: string;
}

type TransactionStatus = "idle" | "approving" | "approved" | "creating" | "success" | "error";

interface TransactionState {
  status: TransactionStatus;
  error?: string;
  txHash?: string;
  approveTxHash?: string;
}

export function CreateStreamModal({ isOpen, onClose }: CreateStreamModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [transactionState, setTransactionState] = useState<TransactionState>({ status: "idle" });
  const [formData, setFormData] = useState<FormData>({
    name: "",
    token: "",
    recipient: "",
    amount: "",
    duration: "",
    enableCliff: false,
    cliffDays: "7",
    startTime: "now",
    customDate: "",
    customTime: "",
  });

  const wallet = useWallet();
  const { tokenBalances, loading: balancesLoading } = useTokenBalances(wallet.address);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setTransactionState({ status: "idle" });
      setFormData({
        name: "",
        token: "",
        recipient: "",
        amount: "",
        duration: "",
        enableCliff: false,
        cliffDays: "7",
        startTime: "now",
        customDate: "",
        customTime: "",
      });
    }
  }, [isOpen]);

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateDailyUnlock = () => {
    if (formData.amount && formData.duration) {
      const amount = parseFloat(formData.amount);
      const days = parseInt(formData.duration);
      return (amount / days).toFixed(2);
    }
    return "0";
  };



  const nextStep = () => {
    if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as Step);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Stream Details";
      case 2: return "Schedule & Security";
      case 3: return "Review & Deploy";
      default: return "";
    }
  };

  const approveToken = async () => {
    if (!wallet.address || !formData.token || !formData.amount) {
      setTransactionState({ status: "error", error: "Please fill required fields" });
      return;
    }

    try {
      setTransactionState({ status: "approving" });

      // Create wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum!)
      });

      // Convert amount to wei (assuming 18 decimals)
      const totalAmount = parseUnits(formData.amount, 18);

      // Call approve function on the token contract
      const hash = await walletClient.writeContract({
        address: formData.token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [
          CONTRACT_ADDRESS, // spender (the stream contract)
          totalAmount // amount to approve
        ],
        account: wallet.address as `0x${string}`
      });

      setTransactionState({ status: "approved", approveTxHash: hash });
      console.log("Token approved successfully!", { hash, amount: formData.amount });
    } catch (error: any) {
      console.error("Error approving token:", error);
      setTransactionState({ 
        status: "error", 
        error: error.message || "Failed to approve token" 
      });
    }
  };

  const createStream = async () => {
    if (!wallet.address || !formData.name || !formData.token || !formData.recipient || !formData.amount || !formData.duration) {
      setTransactionState({ status: "error", error: "Please fill all required fields" });
      return;
    }

    try {
      setTransactionState({ status: "creating" });

      // Create wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum!)
      });

      // Generate unique stream ID based on name
      const streamId = `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      
      // Convert form data to contract parameters
      const totalAmount = parseUnits(formData.amount, 18); // Assuming 18 decimals
      const duration = BigInt(parseInt(formData.duration) * 24 * 60 * 60); // Convert days to seconds
      const cliffDuration = formData.enableCliff ? BigInt(parseInt(formData.cliffDays) * 24 * 60 * 60) : BigInt(0);

      // Call createStream function
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CREATE_STREAM_ABI,
        functionName: "createStream",
        args: [
          streamId,
          formData.recipient as `0x${string}`,
          formData.token as `0x${string}`,
          totalAmount,
          duration,
          cliffDuration
        ],
        account: wallet.address as `0x${string}`
      });

      setTransactionState({ ...transactionState, status: "success", txHash: hash });
      console.log("Stream created successfully!", { hash, streamId });
    } catch (error: any) {
      console.error("Error creating stream:", error);
      setTransactionState({ 
        status: "error", 
        error: error.message || "Failed to create stream" 
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border/50 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-medium">CREATE NEW STREAM</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {currentStep} of 3: {getStepTitle()}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Indicators */}
        <div className="flex items-center gap-2 px-6 py-4 border-b">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full ${
                step <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Wallet Connection Status */}
              {!wallet.isConnected && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Wallet not connected</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1 mb-3">
                      Please connect your wallet to see your available tokens.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={wallet.connectWallet} 
                      disabled={wallet.isConnecting}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      {wallet.isConnecting ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Stream Name */}
              <div className="space-y-2">
                <Label>Stream Name</Label>
                <Input
                  placeholder="My Payment Stream"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                />
              </div>

              {/* No tokens available */}
              {wallet.isConnected && tokenBalances.length === 0 && !balancesLoading && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">No tokens available</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      You don't have any supported tokens with a balance of at least {MINIMUM_BALANCE_THRESHOLD.toLocaleString()} units. Make sure you're connected to the Sepolia network and have sufficient test tokens.
                    </p>
                  </CardContent>
                </Card>
              )}
              {/* Token Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Token</Label>
                  <Select 
                    value={formData.token} 
                    onValueChange={(value) => updateFormData("token", value)}
                    disabled={!wallet.isConnected || tokenBalances.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={wallet.isConnected ? (balancesLoading ? "Loading..." : "Select token") : "Connect wallet"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tokenBalances.map((token) => (
                        <SelectItem key={token.address} value={token.address}>
                          <div className="flex items-center justify-between w-full">
                            <span>{token.symbol}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {formatBalance(token.formattedBalance)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <span className="text-sm text-muted-foreground">
                    Balance: {(() => {
                      const selectedToken = tokenBalances.find(t => t.address === formData.token);
                      return selectedToken ? formatBalance(selectedToken.formattedBalance) : "0.00";
                    })()}
                  </span>
                </div>
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Input
                  placeholder="0x1234567890abcdef..."
                  value={formData.recipient}
                  onChange={(e) => updateFormData("recipient", e.target.value)}
                />
              </div>

              {/* Amount and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="flex">
                    <Input
                      type="number"
                      placeholder="10,000"
                      value={formData.amount}
                      onChange={(e) => updateFormData("amount", e.target.value)}
                      className="rounded-r-none"
                      disabled={!wallet.isConnected || !formData.token}
                    />
                    <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                      {(() => {
                        const selectedToken = tokenBalances.find(t => t.address === formData.token);
                        return selectedToken?.symbol || "Token";
                      })()}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="flex">
                    <Input
                      type="number"
                      placeholder="30"
                      value={formData.duration}
                      onChange={(e) => updateFormData("duration", e.target.value)}
                      className="rounded-r-none"
                    />
                    <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">days</div>
                  </div>
                </div>
              </div>


              {/* Cliff */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cliff"
                    checked={formData.enableCliff}
                    onCheckedChange={(checked: boolean) => updateFormData("enableCliff", checked)}
                  />
                  <Label htmlFor="cliff">Enable cliff</Label>
                  {formData.enableCliff && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.cliffDays}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData("cliffDays", e.target.value)}
                        className="w-16 h-8"
                      />
                      <span className="text-sm">days</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Start Date */}
              <div className="space-y-3">
                <h3 className="font-medium">START DATE</h3>
                <RadioGroup
                  value={formData.startTime}
                  onValueChange={(value: string) => updateFormData("startTime", value)}
                  className="grid grid-cols-2 gap-4"
                >
                  <Card className={formData.startTime === "now" ? "ring-2 ring-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="now" id="now" />
                        <Label htmlFor="now" className="font-medium">Immediately</Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Start streaming now</p>
                    </CardContent>
                  </Card>
                  
                  <Card className={formData.startTime === "custom" ? "ring-2 ring-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="font-medium">Custom Date/Time</Label>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="date"
                          value={formData.customDate}
                          onChange={(e) => updateFormData("customDate", e.target.value)}
                          className="text-xs"
                        />
                        <Input
                          type="time"
                          value={formData.customTime}
                          onChange={(e) => updateFormData("customTime", e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>

            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Transaction Status */}
              {transactionState.status !== "idle" && (
                <Card className={`${
                  transactionState.status === "error" ? "border-red-200 bg-red-50" :
                  transactionState.status === "success" ? "border-green-200 bg-green-50" :
                  "border-blue-200 bg-blue-50"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {transactionState.status === "creating" && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                      {transactionState.status === "success" && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {transactionState.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        transactionState.status === "error" ? "text-red-800" :
                        transactionState.status === "success" ? "text-green-800" :
                        "text-blue-800"
                      }`}>
                        {transactionState.status === "approving" ? "Approving Token..." :
                         transactionState.status === "approved" ? "Token Approved - Ready to Create Stream" :
                         transactionState.status === "creating" ? "Creating Stream..." :
                         transactionState.status === "success" ? "Stream Created Successfully!" :
                         "Transaction Failed"}
                      </span>
                    </div>
                    {transactionState.error && (
                      <p className="text-sm text-red-700 mt-1">
                        {transactionState.error}
                      </p>
                    )}
                    {transactionState.approveTxHash && (
                      <p className="text-sm text-green-700 mt-1">
                        Approve Tx: <code className="bg-green-100 px-1 rounded text-xs">
                          {transactionState.approveTxHash.slice(0, 10)}...{transactionState.approveTxHash.slice(-8)}
                        </code>
                      </p>
                    )}
                    {transactionState.txHash && (
                      <p className="text-sm text-green-700 mt-1">
                        Create Stream Tx: <code className="bg-green-100 px-1 rounded text-xs">
                          {transactionState.txHash.slice(0, 10)}...{transactionState.txHash.slice(-8)}
                        </code>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              {/* Stream Summary */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">STREAM SUMMARY</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">{formData.name || "Unnamed Stream"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Token:</span>
                      <span className="font-medium">{(() => {
                        const selectedToken = tokenBalances.find(t => t.address === formData.token);
                        return selectedToken?.symbol || "Token";
                      })()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">{formData.amount || "0"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recipient:</span>
                      <span className="font-medium font-mono">
                        {formData.recipient ? `${formData.recipient.slice(0, 6)}...${formData.recipient.slice(-4)}` : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">
                        {formData.duration && formData.duration !== "" && formData.duration !== "0" 
                          ? `${formData.duration} days` 
                          : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cliff:</span>
                      <span className="font-medium">{formData.enableCliff ? `${formData.cliffDays} days` : "None"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Start:</span>
                      <span className="font-medium">
                        {formData.startTime === "now" ? "Immediately" : `${formData.customDate} ${formData.customTime}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Actions - Hide when transaction is successful */}
              {transactionState.status !== "success" && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3">APPROVE</h3>
                    <div className="p-3 bg-muted rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Approve {(() => {
                          const selectedToken = tokenBalances.find(t => t.address === formData.token);
                          return selectedToken?.symbol || "Token";
                        })()} spend</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={approveToken}
                          disabled={transactionState.status === "approving" || transactionState.status === "approved" || transactionState.status === "creating"}
                        >
                          {transactionState.status === "approving" && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {transactionState.status === "approved" && (
                            <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                          )}
                          {transactionState.status === "approving" ? "Approving..." :
                           transactionState.status === "approved" ? "Approved" :
                           "Sign Transaction"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <div className="flex gap-2">
            {/* Hide Back button when transaction is successful */}
            {currentStep > 1 && transactionState.status !== "success" && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep === 1 && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
          
          <div>
            {currentStep < 3 ? (
              <Button onClick={nextStep}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={transactionState.status === "success" ? onClose : createStream}
                disabled={transactionState.status === "creating" || transactionState.status === "approving" || transactionState.status === "idle"}
                className={transactionState.status === "success" ? "bg-green-600 hover:bg-green-700 w-full" : ""}
              >
                {transactionState.status === "creating" && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {transactionState.status === "success" && (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {transactionState.status === "creating" ? "Creating Stream..." :
                 transactionState.status === "success" ? "Stream Created!" :
                 transactionState.status === "approved" ? "Create Stream" :
                 "Approve Token First"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}