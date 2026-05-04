import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Store, Truck, Calendar, Wallet } from "lucide-react";
import { toast } from "sonner";
import SubscriptionCheckout from "@/components/SubscriptionCheckout";
import type { SubscriptionPlan } from "@/types";

export default function SubscriptionPage() {
  const { user, capabilities } = useAuth();
  const { subscriptionPlans, fetchSubscriptionPlans } = useData();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);

  const currentPlanId = user?.subscription?.plan || "free";

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (plan.planId === currentPlanId) {
      toast.info("You are already subscribed to this plan");
      return;
    }
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `KES ${price.toLocaleString()}`;
  };

  const formatDuration = (type: string) => {
    const labels: Record<string, string> = {
      monthly: "/month",
      quarterly: "/quarter",
      yearly: "/year",
    };
    return labels[type] || "/month";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">Choose the plan that fits your needs</p>
      </div>

      {subscriptionPlans.length === 0 ? (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptionPlans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.planId;
            
            return (
              <Card key={plan.planId} className={isCurrentPlan ? "border-primary ring-1 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                      )}
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="default" className="bg-primary">Current</Badge>
                    )}
                  </div>
                  <CardDescription className="text-2xl font-bold text-foreground mt-2">
                    {formatPrice(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatDuration(plan.durationType)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-2">
                    {plan.capabilities?.canSell && (
                      <Badge className="bg-green-100 text-green-700">
                        <Store className="w-3 h-3 mr-1" /> Can Sell
                      </Badge>
                    )}
                    {plan.capabilities?.canDeliver && (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Truck className="w-3 h-3 mr-1" /> Can Deliver
                      </Badge>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {plan.limits?.listings === -1 ? "Unlimited" : plan.limits?.listings || 0} listings
                    </Badge>
                    <Badge variant="outline">
                      <Truck className="w-3 h-3 mr-1" />
                      {plan.limits?.deliveries === -1 ? "Unlimited" : plan.limits?.deliveries || 0} deliveries
                    </Badge>
                  </div>

                  <ul className="space-y-2 text-sm">
                    {(plan.features || []).map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "secondary" : "default"}
                    disabled={isCurrentPlan}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {isCurrentPlan ? "Current Plan" : "Subscribe"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Your Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={capabilities.canBrowse ? "default" : "outline"}>Browse</Badge>
            <Badge variant={capabilities.canSell ? "default" : "outline"} className={capabilities.canSell ? "bg-green-500" : ""}>Sell</Badge>
            <Badge variant={capabilities.canDeliver ? "default" : "outline"} className={capabilities.canDeliver ? "bg-blue-500" : ""}>Deliver</Badge>
          </div>
          {user?.subscription && user.subscription.status !== "active" && (
            <p className="text-sm text-amber-600">
              Status: {user.subscription.status}
              {user.subscription.endDate && new Date(user.subscription.endDate) < new Date() && " (Expired)"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checkout Modal */}
      <SubscriptionCheckout
        plan={selectedPlan!}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          setSelectedPlan(null);
        }}
      />
    </div>
  );
}
