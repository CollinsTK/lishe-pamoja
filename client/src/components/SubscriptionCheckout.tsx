import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, Smartphone, CheckCircle, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/types";

interface SubscriptionCheckoutProps {
  plan: SubscriptionPlan;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubscriptionCheckout({ plan, isOpen, onClose, onSuccess }: SubscriptionCheckoutProps) {
  const { user, updateAuthUser } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "mpesa">("wallet");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const walletBalance = user?.walletBalance || 0;
  const hasEnoughBalance = walletBalance >= plan.price;

  const handlePayment = async () => {
    setError(null);
    setIsProcessing(true);
    setCountdown(5);

    // Start countdown animation
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const response = await apiClient.post("/users/subscription/subscribe", {
        planId: plan.planId,
        paymentMethod,
        phoneNumber: paymentMethod === "mpesa" ? phoneNumber : undefined,
      });

      if (response.success) {
        // Wait for the 5-second processing on the backend
        setTimeout(async () => {
          clearInterval(countdownInterval);
          
          // Check if wallet payment succeeded (balance was deducted)
          if (paymentMethod === "wallet") {
            if (hasEnoughBalance) {
              // Update user with new subscription info
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + plan.durationDays);
              
              updateAuthUser({
                subscription: {
                  plan: plan.planId,
                  status: "active",
                  startDate: new Date().toISOString(),
                  endDate: endDate.toISOString(),
                  paymentMethod: "wallet",
                  autoRenew: false,
                },
                capabilities: {
                  canBrowse: true,
                  canSell: plan.capabilities.canSell,
                  canDeliver: plan.capabilities.canDeliver,
                },
                walletBalance: walletBalance - plan.price,
              });
              
              toast.success(`Successfully subscribed to ${plan.name}!`);
              onSuccess();
              onClose();
            } else {
              setError("Insufficient wallet balance. Please top up or choose M-Pesa.");
              setIsProcessing(false);
            }
          } else {
            // M-Pesa - show pending message
            toast.success("M-Pesa payment initiated. Check your phone to complete payment.");
            onClose();
          }
        }, 5500); // Slightly longer than backend delay to ensure completion
      } else {
        clearInterval(countdownInterval);
        setError(response.message || "Payment failed. Please try again.");
        setIsProcessing(false);
      }
    } catch (err) {
      clearInterval(countdownInterval);
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? "Free" : `KES ${price.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{plan.name}</span>
              <span className="text-lg font-bold text-primary">{formatPrice(plan.price)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-primary/10 rounded">{plan.durationType}</span>
              {plan.capabilities.canSell && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Can Sell</span>
              )}
              {plan.capabilities.canDeliver && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Can Deliver</span>
              )}
            </div>
          </div>

          {isProcessing ? (
            <div className="text-center space-y-4 py-6">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <p className="font-medium">Processing payment...</p>
                <p className="text-2xl font-bold text-primary mt-2">{countdown}s</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we process your {paymentMethod === "wallet" ? "wallet" : "M-Pesa"} payment
                </p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "wallet" | "mpesa")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="wallet">
                    <Wallet className="h-4 w-4 mr-2" />
                    Wallet
                  </TabsTrigger>
                  <TabsTrigger value="mpesa">
                    <Smartphone className="h-4 w-4 mr-2" />
                    M-Pesa
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="wallet" className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Wallet Balance</span>
                      <span className="font-semibold">KES {walletBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount to Deduct</span>
                      <span className="font-semibold text-primary">KES {plan.price.toLocaleString()}</span>
                    </div>
                    <div className="border-t mt-3 pt-3 flex justify-between items-center">
                      <span className="font-medium">Remaining Balance</span>
                      <span className={`font-bold ${hasEnoughBalance ? "text-green-600" : "text-destructive"}`}>
                        KES {(walletBalance - plan.price).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!hasEnoughBalance && (
                    <div className="text-sm text-destructive">
                      Insufficient balance. Please top up your wallet or choose M-Pesa.
                    </div>
                  )}

                  <Button
                    onClick={handlePayment}
                    disabled={!hasEnoughBalance}
                    className="w-full"
                  >
                    Pay with Wallet
                  </Button>
                </TabsContent>

                <TabsContent value="mpesa" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">M-Pesa Phone Number</Label>
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="254712345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your M-Pesa registered phone number starting with 254
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-2">Payment Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Click "Pay with M-Pesa" below</li>
                      <li>Wait for the STK push on your phone</li>
                      <li>Enter your M-Pesa PIN to confirm</li>
                      <li>Your subscription will be activated</li>
                    </ol>
                  </div>

                  <Button
                    onClick={handlePayment}
                    disabled={!phoneNumber || phoneNumber.length < 10}
                    className="w-full"
                  >
                    Pay with M-Pesa
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
