import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { samplePlans } from "@/data/sampleData";
import { Check } from "lucide-react";

export default function VendorSubscription() {
  const currentPlan = samplePlans[0];

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">Subscription</h1>

      {/* Current plan */}
      <Card className="p-5 border-primary border-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold">Current Plan: {currentPlan.name}</h3>
            <p className="text-sm text-muted-foreground">Renews on March 15, 2026</p>
          </div>
          <Badge className="bg-success/10 text-success">Active</Badge>
        </div>
        <p className="font-heading font-bold text-2xl text-primary">KES {currentPlan.price}<span className="text-sm text-muted-foreground font-normal">/month</span></p>
      </Card>

      {/* All plans */}
      <h3 className="font-heading font-semibold">All Plans</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {samplePlans.map((plan) => (
          <Card key={plan.id} className={`p-5 space-y-4 ${plan.id === currentPlan.id ? "border-primary border-2" : ""}`}>
            <div>
              <h4 className="font-heading font-semibold">{plan.name}</h4>
              <p className="font-heading font-bold text-2xl mt-1">KES {plan.price}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.id === currentPlan.id ? "outline" : "default"}
              className={plan.id !== currentPlan.id ? "bg-gradient-hero text-primary-foreground" : ""}
              disabled={plan.id === currentPlan.id}
            >
              {plan.id === currentPlan.id ? "Current Plan" : "Upgrade"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
