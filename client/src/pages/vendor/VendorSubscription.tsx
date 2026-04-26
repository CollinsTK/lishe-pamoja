import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function VendorSubscription() {
  const { subscriptionPlans, updateUser } = useData();
  const { user, token, updateAuthUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  // Get current user's subscription plan from user data
  const currentPlanId = user?.subscriptionPlanId || "sp1";
  const currentPlan = subscriptionPlans.find(p => p.id === currentPlanId) || subscriptionPlans[0];

  const handlePlanChange = async (newPlanId: string) => {
    const newPlan = subscriptionPlans.find(p => p.id === newPlanId);
    if (!newPlan) return;

    // Don't allow changing to the same plan
    if (newPlanId === currentPlanId) return;

    setLoading(newPlanId);

    try {
      // Call the upgrade API
      const response = await fetch(`${API_URL}/users/subscription/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetPlan: newPlanId,
          phoneNumber: user?.phone || "254700000000", // Use user's registered phone
          price: newPlan.price,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (user) {
          updateUser(user.id, { subscriptionPlanId: newPlanId });
          updateAuthUser({ subscriptionPlanId: newPlanId });
        }
        
        if (newPlan.price === 0) {
          toast.success(`Subscription upgraded to ${newPlan.name} plan`);
        } else {
          toast.success(`Payment initiated for ${newPlan.name} plan. Check your phone for STK push.`);
        }
      } else {
        toast.error(data.message || "Failed to change subscription");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      // Fallback to local update if API fails
      if (user) {
        updateUser(user.id, { subscriptionPlanId: newPlanId });
        updateAuthUser({ subscriptionPlanId: newPlanId });
      }
      toast.success(`Subscription changed to ${newPlan.name} (offline mode)`);
    } finally {
      setLoading(null);
    }
  };

  const getCurrentPlanIndex = () => subscriptionPlans.findIndex(p => p.id === currentPlan?.id);
  const currentIndex = getCurrentPlanIndex();

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">Subscription</h1>

      {/* Current plan */}
      <Card className="p-5 border-primary border-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold">Current Plan: {currentPlan?.name || "Starter"}</h3>
            <p className="text-sm text-muted-foreground">Renews on {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-KE")}</p>
          </div>
          <Badge className="bg-success/10 text-success">Active</Badge>
        </div>
        <p className="font-heading font-bold text-2xl text-primary">KES {currentPlan?.price.toLocaleString() || "0"}<span className="text-sm text-muted-foreground font-normal">/month</span></p>
        <div className="mt-3 text-sm text-muted-foreground">
          Listings: {currentPlan?.listingsLimit === -1 ? "Unlimited" : currentPlan?.listingsLimit}
        </div>
      </Card>

      {/* All plans */}
      <h3 className="font-heading font-semibold">All Plans</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {subscriptionPlans.map((plan, index) => {
          const isCurrent = plan.id === currentPlan?.id;
          const isUpgrade = index > currentIndex;
          const isDowngrade = index < currentIndex;

          return (
            <Card key={plan.id} className={`p-5 space-y-4 ${isCurrent ? "border-primary border-2" : ""}`}>
              <div>
                <h4 className="font-heading font-semibold">{plan.name}</h4>
                <p className="font-heading font-bold text-2xl mt-1">KES {plan.price.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
              </div>
              <ul className="space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? "outline" : "default"}
                className={`${!isCurrent ? "bg-gradient-hero text-primary-foreground" : ""} ${isDowngrade ? "border-warning text-warning hover:bg-warning/10" : ""}`}
                disabled={isCurrent || loading === plan.id}
                onClick={() => handlePlanChange(plan.id)}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                  </>
                ) : isCurrent ? (
                  "Current Plan"
                ) : isUpgrade ? (
                  <>
                    <ArrowUp className="w-4 h-4 mr-2" /> Upgrade
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4 mr-2" /> Downgrade
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
