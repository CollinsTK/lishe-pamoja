import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/types";

interface SubscriptionCheckoutProps {
  plan: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Stage = "confirm" | "processing" | "success" | "failed";

export default function SubscriptionCheckout({ plan, isOpen, onClose, onSuccess }: SubscriptionCheckoutProps) {
  const { user, refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>("confirm");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      setStage("confirm");
      setError(null);
      setCountdown(5);
    }
  }, [isOpen]);

  if (!plan) return null;

  const handleSubscribe = async () => {
    setError(null);
    setStage("processing");
    setCountdown(5);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);

    try {
      const response = await apiClient.post("/users/subscription/subscribe", {
        planId: plan.planId,
      });

      if (!response.success) {
        clearInterval(timerRef.current!);
        setError(response.message || "Subscription failed. Please try again.");
        setStage("failed");
        return;
      }

      // If M-Pesa STK Push was triggered, poll for payment confirmation
      if (response.checkoutRequestId) {
        const checkoutRequestId = response.checkoutRequestId;
        let attempts = 0;
        const maxAttempts = 15;

        const pollTimer = setInterval(async () => {
          attempts++;
          try {
            const statusRes: any = await apiClient.get(
              `/users/subscription/mpesa-status?checkoutRequestId=${checkoutRequestId}`
            );
            if (statusRes.resultCode === 0 || statusRes.status === "completed") {
              clearInterval(pollTimer);
              clearInterval(timerRef.current!);
              await refreshUser();
              setStage("success");
              toast.success(`You are now subscribed to ${plan.name}!`);
              setTimeout(() => { onSuccess(); onClose(); }, 2000);
            } else if (statusRes.resultCode === 1032 || statusRes.status === "cancelled") {
              clearInterval(pollTimer);
              clearInterval(timerRef.current!);
              setError("Payment was cancelled. Please try again.");
              setStage("failed");
            } else if (attempts >= maxAttempts) {
              clearInterval(pollTimer);
              clearInterval(timerRef.current!);
              setError("Payment timed out. If you completed the payment, please refresh the page.");
              setStage("failed");
            }
          } catch {
            if (attempts >= maxAttempts) {
              clearInterval(pollTimer);
              clearInterval(timerRef.current!);
              setError("Could not verify payment status. Please refresh the page.");
              setStage("failed");
            }
          }
        }, 4000);
      } else {
        // Wallet payment — instant, no polling needed
        clearInterval(timerRef.current!);
        await refreshUser();
        setStage("success");
        toast.success(`You are now subscribed to ${plan.name}!`);
        setTimeout(() => { onSuccess(); onClose(); }, 2000);
      }
    } catch (err) {
      clearInterval(timerRef.current!);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStage("failed");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { if (stage !== "processing") onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {stage === "confirm" && "Confirm Subscription"}
            {stage === "processing" && "Activating Subscription"}
            {stage === "success" && "Subscription Activated!"}
            {stage === "failed" && "Subscription Failed"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Confirm */}
          {stage === "confirm" && (
            <>
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-base">{plan.name}</span>
                  <span className="text-lg font-bold text-primary">
                    KES {plan.price.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/{plan.durationType === "monthly" ? "mo" : plan.durationType}</span>
                  </span>
                </div>
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                <div className="flex flex-wrap gap-1.5 text-xs pt-1">
                  {plan.capabilities.canSell && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Can Sell</span>}
                  {plan.capabilities.canDeliver && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Can Deliver</span>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                By confirming, your account will be upgraded to the <span className="font-medium text-foreground">{plan.name}</span> plan.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-1" onClick={handleSubscribe}>Confirm</Button>
              </div>
            </>
          )}

          {/* Processing */}
          {stage === "processing" && (
            <div className="text-center space-y-4 py-4">
              <Loader2 className="h-14 w-14 animate-spin mx-auto text-primary" />
              <div>
                <p className="font-semibold text-base">Setting up your subscription...</p>
                <p className="text-4xl font-bold text-primary mt-3">{countdown}s</p>
                <p className="text-sm text-muted-foreground mt-2">Activating {plan.name}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {stage === "success" && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle className="h-14 w-14 mx-auto text-green-500" />
              <p className="font-semibold text-lg">You're all set!</p>
              <p className="text-sm text-muted-foreground">
                Your <span className="font-medium text-foreground">{plan.name}</span> subscription is now active.
              </p>
            </div>
          )}

          {/* Failed */}
          {stage === "failed" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-1" onClick={() => { setStage("confirm"); setError(null); }}>Try Again</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
