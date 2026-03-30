import { samplePlans } from "@/data/sampleData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Check } from "lucide-react";

export default function AdminSubscriptions() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">Subscription Plans</h1>
        <Button className="bg-gradient-hero text-primary-foreground">+ New Plan</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {samplePlans.map((plan) => (
          <Card key={plan.id} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">{plan.name}</h3>
              <button className="p-1.5 rounded-lg hover:bg-muted"><Edit className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="font-heading font-bold text-2xl text-primary">KES {plan.price}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
            <Badge variant="outline">{plan.listingsLimit === 999 ? "Unlimited" : plan.listingsLimit} listings</Badge>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-3 h-3 text-success" /> {f}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Active subscriptions summary */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-3">Active Subscriptions</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-muted rounded-xl">
            <p className="font-heading font-bold text-2xl text-primary">24</p>
            <p className="text-xs text-muted-foreground">Starter</p>
          </div>
          <div className="p-4 bg-muted rounded-xl">
            <p className="font-heading font-bold text-2xl text-secondary">12</p>
            <p className="text-xs text-muted-foreground">Growth</p>
          </div>
          <div className="p-4 bg-muted rounded-xl">
            <p className="font-heading font-bold text-2xl">3</p>
            <p className="text-xs text-muted-foreground">Enterprise</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
