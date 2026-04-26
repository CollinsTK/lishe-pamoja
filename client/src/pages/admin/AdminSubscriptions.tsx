import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Check, Trash2, Plus, X, Infinity } from "lucide-react";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminSubscriptions() {
  const { subscriptionPlans, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, users } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", price: "", listingsLimit: "", features: "", isUnlimited: false });

  const openNewPlan = () => {
    setEditingPlan(null);
    setFormData({ name: "", price: "", listingsLimit: "", features: "", isUnlimited: false });
    setIsDialogOpen(true);
  };

  const openEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      listingsLimit: plan.listingsLimit === -1 ? "" : plan.listingsLimit.toString(),
      features: plan.features ? plan.features.join("\n") : "",
      isUnlimited: plan.listingsLimit === -1,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.price) {
      toast.error("Please fill in plan name and price");
      return;
    }

    // Validate listings limit
    let listingsLimit: number;
    if (formData.isUnlimited) {
      listingsLimit = -1; // -1 means unlimited
    } else if (!formData.listingsLimit) {
      toast.error("Please enter a listings limit or check unlimited");
      return;
    } else {
      listingsLimit = parseInt(formData.listingsLimit);
      if (isNaN(listingsLimit) || (listingsLimit < 1 && listingsLimit !== -1)) {
        toast.error("Listings limit must be a positive number or -1 for unlimited");
        return;
      }
    }

    const planData = {
      name: formData.name,
      price: parseInt(formData.price),
      listingsLimit,
      features: formData.features.split("\n").filter(f => f.trim()),
    };

    if (editingPlan) {
      updateSubscriptionPlan(editingPlan.id, planData);
      toast.success(`Plan "${planData.name}" updated successfully`);
    } else {
      const newPlan = {
        ...planData,
        id: `sp_${Date.now()}`,
      };
      addSubscriptionPlan(newPlan);
      toast.success(`Plan "${planData.name}" created successfully`);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (planId: string, planName: string) => {
    if (confirm(`Are you sure you want to delete "${planName}"?`)) {
      deleteSubscriptionPlan(planId);
      toast.success(`Plan "${planName}" deleted`);
    }
  };

  // Count actual users by their subscription plan
  const planCounts = subscriptionPlans.reduce((acc, plan) => {
    acc[plan.id] = 0;
    return acc;
  }, {} as Record<string, number>);

  // Count users with each subscription plan
  users.forEach(u => {
    if (u.subscriptionPlanId && planCounts[u.subscriptionPlanId] !== undefined) {
      planCounts[u.subscriptionPlanId]++;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">Subscription Plans</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-hero text-primary-foreground" onClick={openNewPlan}>
              <Plus className="w-4 h-4 mr-2" /> New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Plan Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Starter, Growth, Enterprise" />
              </div>
              <div className="space-y-2">
                <Label>Price (KES) *</Label>
                <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isUnlimited"
                    checked={formData.isUnlimited || formData.listingsLimit === "-1"}
                    onChange={e => setFormData({...formData, isUnlimited: e.target.checked, listingsLimit: e.target.checked ? "-1" : ""})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isUnlimited" className="font-normal">Unlimited listings</Label>
                </div>
                {!formData.isUnlimited && formData.listingsLimit !== "-1" && (
                  <>
                    <Label>Listings Limit *</Label>
                    <Input 
                      type="number" 
                      value={formData.listingsLimit} 
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({...formData, listingsLimit: val, isUnlimited: val === "-1"});
                      }} 
                      placeholder="10" 
                      min="-1"
                    />
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} placeholder="Up to 10 listings/month&#10;Basic analytics&#10;Email support" rows={4} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="bg-gradient-hero text-primary-foreground">{editingPlan ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {subscriptionPlans.map((plan) => (
          <Card key={plan.id} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">{plan.name}</h3>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => openEditPlan(plan)} title="Edit plan">
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-destructive/10" onClick={() => handleDelete(plan.id, plan.name)} title="Delete plan">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
            <p className="font-heading font-bold text-2xl text-primary">KES {plan.price.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
            <Badge variant="outline">
              {plan.listingsLimit === -1 ? (
                <span className="flex items-center gap-1">
                  <Infinity className="w-3 h-3" /> Unlimited
                </span>
              ) : (
                `${plan.listingsLimit} listings`
              )}
            </Badge>
            <ul className="space-y-1.5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-3 h-3 text-success" /> {f}
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">{planCounts[plan.id] || 0} active subscribers</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Active subscriptions summary */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-3">Active Subscriptions by Plan</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {subscriptionPlans.map((plan) => (
            <div key={plan.id} className="p-4 bg-muted rounded-xl">
              <p className="font-heading font-bold text-2xl text-primary">{planCounts[plan.id] || 0}</p>
              <p className="text-xs text-muted-foreground">{plan.name}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
