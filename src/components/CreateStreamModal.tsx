import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

interface FormData {
  token: string;
  recipient: string;
  amount: string;
  duration: string;
  enableCliff: boolean;
  cliffDays: string;
  enableBoost: boolean;
  startTime: "now" | "custom";
  customDate: string;
  customTime: string;
  unlockSchedule: "linear" | "stepped" | "custom";
  stepDays: string;
  stepAmount: string;
  allowEarlyClaim: boolean;
  allowPauseResume: boolean;
  allowTopUp: boolean;
  allowThirdParty: boolean;
}

export function CreateStreamModal({ isOpen, onClose }: CreateStreamModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    token: "",
    recipient: "",
    amount: "",
    duration: "",
    enableCliff: false,
    cliffDays: "7",
    enableBoost: true,
    startTime: "now",
    customDate: "",
    customTime: "",
    unlockSchedule: "stepped",
    stepDays: "7",
    stepAmount: "",
    allowEarlyClaim: true,
    allowPauseResume: true,
    allowTopUp: true,
    allowThirdParty: false,
  });

  const tokens = [
    { value: "usdc", label: "USDC", balance: "25,000.00" },
    { value: "dai", label: "DAI", balance: "15,678.90" },
    { value: "usdt", label: "USDT", balance: "8,432.11" },
    { value: "eth", label: "ETH", balance: "12.45" }
  ];

  const updateFormData = (field: keyof FormData, value: any) => {
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

  const calculateBoostEarnings = () => {
    if (formData.amount && formData.enableBoost) {
      const amount = parseFloat(formData.amount);
      const duration = parseInt(formData.duration) || 30;
      const apr = 0.072; // 7.2% APR
      return ((amount * apr * duration) / 365).toFixed(2);
    }
    return "0";
  };

  const calculateStepAmount = () => {
    if (formData.amount && formData.stepDays) {
      const amount = parseFloat(formData.amount);
      const duration = parseInt(formData.duration) || 30;
      const stepDays = parseInt(formData.stepDays);
      const steps = Math.ceil(duration / stepDays);
      return (amount / steps).toFixed(2);
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
              {/* Token Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Token</Label>
                  <Select value={formData.token} onValueChange={(value) => updateFormData("token", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="USDC" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.value} value={token.value}>
                          {token.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <span className="text-sm text-muted-foreground">
                    Balance: {tokens.find(t => t.value === formData.token)?.balance || "0.00"}
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
                    />
                    <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                      {formData.token?.toUpperCase() || "USDC"}
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
                    onCheckedChange={(checked) => updateFormData("enableCliff", checked)}
                  />
                  <Label htmlFor="cliff">Enable cliff</Label>
                  {formData.enableCliff && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.cliffDays}
                        onChange={(e) => updateFormData("cliffDays", e.target.value)}
                        className="w-16 h-8"
                      />
                      <span className="text-sm">days</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Boost */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="boost"
                    checked={formData.enableBoost}
                    onCheckedChange={(checked) => updateFormData("enableBoost", checked)}
                  />
                  <Label htmlFor="boost">Enable yield boost (+7.2% APR)</Label>
                </div>
              </div>

              {/* Preview */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">PREVIEW</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Daily unlock:</span>
                      <span>~{calculateDailyUnlock()} {formData.token?.toUpperCase() || "USDC"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Boost earnings:</span>
                      <span>~{calculateBoostEarnings()} {formData.token?.toUpperCase() || "USDC"} (over {formData.duration || "30"}d)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gas estimate:</span>
                      <span>~$4.50</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Start Date */}
              <div className="space-y-3">
                <h3 className="font-medium">START DATE</h3>
                <RadioGroup
                  value={formData.startTime}
                  onValueChange={(value) => updateFormData("startTime", value)}
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

              {/* Unlock Schedule */}
              <div className="space-y-3">
                <h3 className="font-medium">UNLOCK SCHEDULE</h3>
                <RadioGroup
                  value={formData.unlockSchedule}
                  onValueChange={(value) => updateFormData("unlockSchedule", value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="linear" id="linear" />
                    <Label htmlFor="linear">Linear</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="stepped" id="stepped" />
                    <Label htmlFor="stepped">Stepped</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="customCurve" />
                    <Label htmlFor="customCurve">Custom Curve</Label>
                  </div>
                </RadioGroup>

                {formData.unlockSchedule === "stepped" && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Steps:</span>
                          <Input
                            type="number"
                            value={formData.stepDays}
                            onChange={(e) => updateFormData("stepDays", e.target.value)}
                            className="w-16 h-8"
                          />
                          <span className="text-sm">days</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Unlock:</span>
                          <span className="text-sm font-medium">
                            {calculateStepAmount()} {formData.token?.toUpperCase() || "USDC"} per step
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress visualization */}
                      <div className="relative">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-full"></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Start</span>
                          <span>Day {formData.stepDays}</span>
                          <span>Day {parseInt(formData.stepDays) * 2}</span>
                          <span>Day {parseInt(formData.stepDays) * 3}</span>
                          <span>Day {parseInt(formData.stepDays) * 4}</span>
                          <span>End</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Security & Permissions */}
              <div className="space-y-3">
                <h3 className="font-medium">SECURITY & PERMISSIONS</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="earlyClaim"
                      checked={formData.allowEarlyClaim}
                      onCheckedChange={(checked) => updateFormData("allowEarlyClaim", checked)}
                    />
                    <Label htmlFor="earlyClaim">Allow recipient to claim early (with penalty)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pauseResume"
                      checked={formData.allowPauseResume}
                      onCheckedChange={(checked) => updateFormData("allowPauseResume", checked)}
                    />
                    <Label htmlFor="pauseResume">Allow sender to pause/resume stream</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="topUp"
                      checked={formData.allowTopUp}
                      onCheckedChange={(checked) => updateFormData("allowTopUp", checked)}
                    />
                    <Label htmlFor="topUp">Allow sender to top-up stream amount</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="thirdParty"
                      checked={formData.allowThirdParty}
                      onCheckedChange={(checked) => updateFormData("allowThirdParty", checked)}
                    />
                    <Label htmlFor="thirdParty">Allow third-party withdrawals (whitelist required)</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Stream Summary */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">STREAM SUMMARY</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Token:</span>
                      <span className="font-medium">{formData.token?.toUpperCase() || "USDC"}</span>
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
                      <span className="font-medium">{formData.duration || "0"} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unlock:</span>
                      <span className="font-medium">
                        {formData.unlockSchedule === "stepped" ? `Every ${formData.stepDays} days` : "Linear"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cliff:</span>
                      <span className="font-medium">{formData.enableCliff ? `${formData.cliffDays} days` : "None"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Boost:</span>
                      <span className="font-medium">{formData.enableBoost ? "Enabled (+7.2%)" : "Disabled"}</span>
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

              {/* Transaction Breakdown */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">TRANSACTION BREAKDOWN</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Stream Amount:</span>
                      <span className="font-medium">{formData.amount || "0"} {formData.token?.toUpperCase() || "USDC"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Boost Deposit:</span>
                      <span className="font-medium">
                        {formData.enableBoost ? (parseFloat(formData.amount || "0") * 0.05).toFixed(2) : "0"} {formData.token?.toUpperCase() || "USDC"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network Fee:</span>
                      <span className="font-medium">4.50 USD</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total Required:</span>
                      <span>
                        {((parseFloat(formData.amount || "0")) + (formData.enableBoost ? parseFloat(formData.amount || "0") * 0.05 : 0) + 4.5).toFixed(2)} {formData.token?.toUpperCase() || "USDC"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Actions */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">WALLET ACTIONS</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm">1. Approve {formData.token?.toUpperCase() || "USDC"} spend</span>
                      <Button size="sm" variant="outline">Sign Transaction</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm">2. Create stream</span>
                      <Button size="sm">Deploy Stream</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <div className="flex gap-2">
            {currentStep > 1 && (
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
              <Button onClick={onClose}>
                Create Stream
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}