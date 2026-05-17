import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Loader2, Store, Truck, Calendar, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import SubscriptionCheckout from "@/components/SubscriptionCheckout";
import { apiClient } from "@/lib/apiClient";
import type { SubscriptionPlan } from "@/types";

function daysRemaining(endDate?: string | Date | null): number {
  if (!endDate) return 0;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionPage() {
  const { user, capabilities, refreshUser } = useAuth();
  const { subscriptionPlans } = useData();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState<SubscriptionPlan | null>(null);
  const [changeSummary, setChangeSummary] = useState<string>("");
  const [isChanging, setIsChanging] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);

  const currentPlanId = user?.subscription?.plan;
  const hasActivePlan = user?.subscription?.status === "active" && currentPlanId && currentPlanId !== "free";
  const days = daysRemaining(user?.subscription?.endDate);

  const currentPlan = subscriptionPlans.find(p => p.planId === currentPlanId);

  const getAction = (plan: SubscriptionPlan) => {
    if (plan.planId === currentPlanId) return "current";
    if (!hasActivePlan) return "subscribe";
    if (!currentPlan) return "subscribe";
    if (plan.price > currentPlan.price) return "upgrade";
    return "downgrade";
  };

  const getPreviewSummary = (plan: SubscriptionPlan): string => {
    if (!hasActivePlan || !currentPlan || days === 0) {
      return `You will get ${plan.durationDays} days of ${plan.name}.`;
    }
    const currentDailyRate = currentPlan.price / (currentPlan.durationDays || 30);
    const remainingValue = Math.round(days * currentDailyRate);
    const newDailyRate = plan.price / (plan.durationDays || 30);
    if (plan.price > currentPlan.price) {
      const daysFromCredit = Math.floor(remainingValue / newDailyRate);
      return `Upgrade: Your KES ${remainingValue} remaining credit buys ${daysFromCredit} days on ${plan.name} (higher daily rate = fewer days).`;
    } else {
      const extraDays = Math.floor(remainingValue / newDailyRate);
      const total = plan.durationDays + extraDays;
      return `Downgrade: Your KES ${remainingValue} remaining stretches to ${extraDays} extra days on ${plan.name} → ${total} days total.`;
    }
  };

  const handlePlanClick = (plan: SubscriptionPlan) => {
    const action = getAction(plan);
    if (action === "current") { toast.info("You are already on this plan"); return; }
    if (action === "subscribe") { setSelectedPlan(plan); setIsCheckoutOpen(true); return; }
    setChangeSummary(getPreviewSummary(plan));
    setChangeTarget(plan);
    setIsChanging(true);
  };

  const handleConfirmChange = async () => {
    if (!changeTarget) return;
    setChangeLoading(true);
    try {
      const res = await apiClient.post("/users/subscription/change", { planId: changeTarget.planId });
      if (!res.success) { toast.error(res.message || "Failed to change plan"); return; }
      toast.success(res.summary || `Switched to ${changeTarget.name}`);
      await refreshUser();
      setIsChanging(false);
      setChangeTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChangeLoading(false);
    }
  };

  const formatPrice = (price: number) => price === 0 ? "Free" : `KES ${price.toLocaleString()}`;
  const formatDuration = (type: string) => ({ monthly: "/mo", quarterly: "/qtr", yearly: "/yr" }[type] || "/mo");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">Choose the plan that fits your needs</p>
      </div>

      {/* Current plan banner */}
      {hasActivePlan && currentPlan && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{currentPlan.name} <Badge className="ml-1 bg-primary text-xs">Active</Badge></p>
                  <p className="text-sm text-muted-foreground">
                    {days > 0 ? `${days} day${days !== 1 ? "s" : ""} remaining` : "Expires today"}
                    {user?.subscription?.endDate && ` · Ends ${new Date(user.subscription.endDate).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {capabilities.canSell && <Badge className="bg-green-100 text-green-700"><Store className="w-3 h-3 mr-1" />Sell</Badge>}
                {capabilities.canDeliver && <Badge className="bg-blue-100 text-blue-700"><Truck className="w-3 h-3 mr-1" />Deliver</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {subscriptionPlans.length === 0 ? (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptionPlans.map((plan) => {
            const action = getAction(plan);
            const isCurrent = action === "current";
            const isUpgrade = action === "upgrade";
            const isDowngrade = action === "downgrade";

            return (
              <Card key={plan.planId} className={`relative transition-all ${isCurrent ? "border-primary ring-1 ring-primary" : "hover:shadow-md"}`}>
                {isCurrent && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary shadow">Current Plan</Badge>
                  </div>
                )}
                {isUpgrade && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-green-600 shadow"><ArrowUp className="w-3 h-3 mr-1" />Upgrade</Badge>
                  </div>
                )}
                {isDowngrade && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-amber-500 shadow"><ArrowDown className="w-3 h-3 mr-1" />Downgrade</Badge>
                  </div>
                )}

                <CardHeader className="pb-2 pt-5">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                  <div className="text-2xl font-bold text-foreground">
                    {formatPrice(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">{formatDuration(plan.durationType)}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {plan.capabilities?.canSell && <Badge className="bg-green-100 text-green-700 text-xs"><Store className="w-3 h-3 mr-1" />Sell</Badge>}
                    {plan.capabilities?.canDeliver && <Badge className="bg-blue-100 text-blue-700 text-xs"><Truck className="w-3 h-3 mr-1" />Deliver</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {plan.limits?.listings === -1 ? "Unlimited" : plan.limits?.listings || 0} listings
                    </Badge>
                    <Badge variant="outline">
                      <Truck className="w-3 h-3 mr-1" />
                      {plan.limits?.deliveries === -1 ? "Unlimited" : plan.limits?.deliveries || 0} deliveries
                    </Badge>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {(plan.features || []).map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Prorated preview for active subscribers */}
                  {!isCurrent && hasActivePlan && (
                    <p className="text-xs text-muted-foreground bg-muted rounded p-2 leading-relaxed">
                      {getPreviewSummary(plan)}
                    </p>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full ${isUpgrade ? "bg-green-600 hover:bg-green-700" : isDowngrade ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                    variant={isCurrent ? "secondary" : "default"}
                    disabled={isCurrent}
                    onClick={() => handlePlanClick(plan)}
                  >
                    {isCurrent && "Current Plan"}
                    {action === "subscribe" && "Subscribe"}
                    {isUpgrade && <><ArrowUp className="h-4 w-4 mr-1" />Upgrade</>}
                    {isDowngrade && <><ArrowDown className="h-4 w-4 mr-1" />Downgrade</>}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upgrade/Downgrade Confirm Dialog */}
      <Dialog open={isChanging} onOpenChange={(o) => { if (!changeLoading) setIsChanging(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {changeTarget && getAction(changeTarget) === "upgrade" ? "Confirm Upgrade" : "Confirm Downgrade"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
              <p className="font-medium">Switching to: <span className="text-primary">{changeTarget?.name}</span></p>
              <p className="text-muted-foreground leading-relaxed">{changeSummary}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={changeLoading} onClick={() => setIsChanging(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={changeLoading}
                onClick={handleConfirmChange}
              >
                {changeLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New subscription checkout */}
      <SubscriptionCheckout
        plan={selectedPlan}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={async () => {
          setIsCheckoutOpen(false);
          setSelectedPlan(null);
          await refreshUser();
        }}
      />
    </div>
  );
}
