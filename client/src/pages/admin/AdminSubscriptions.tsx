import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Check, Trash2, Plus, X, Infinity, Store, Truck, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { SubscriptionPlan } from "@/types";

interface PlanFormData {
  name: string;
  description: string;
  price: string;
  durationType: "monthly" | "quarterly" | "yearly";
  canSell: boolean;
  canDeliver: boolean;
  listingsLimit: string;
  deliveriesLimit: string;
  isUnlimitedListings: boolean;
  isUnlimitedDeliveries: boolean;
  features: string;
  isActive: boolean;
}

const defaultFormData: PlanFormData = {
  name: "",
  description: "",
  price: "",
  durationType: "monthly",
  canSell: false,
  canDeliver: false,
  listingsLimit: "20",
  deliveriesLimit: "50",
  isUnlimitedListings: false,
  isUnlimitedDeliveries: false,
  features: "",
  isActive: true,
};

export default function AdminSubscriptions() {
  const { subscriptionPlans, fetchAllSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [isLoading, setIsLoading] = useState(false);

  // Load plans on mount
  useEffect(() => {
    fetchAllSubscriptionPlans();
  }, []);

  const openNewPlan = () => {
    setEditingPlan(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price.toString(),
      durationType: plan.durationType,
      canSell: plan.capabilities?.canSell || false,
      canDeliver: plan.capabilities?.canDeliver || false,
      listingsLimit: plan.limits?.listings === -1 ? "" : (plan.limits?.listings || 0).toString(),
      deliveriesLimit: plan.limits?.deliveries === -1 ? "" : (plan.limits?.deliveries || 0).toString(),
      isUnlimitedListings: plan.limits?.listings === -1,
      isUnlimitedDeliveries: plan.limits?.deliveries === -1,
      features: plan.features ? plan.features.join("\n") : "",
      isActive: plan.isActive !== false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Please fill in plan name and price");
      return;
    }

    const price = parseInt(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error("Price must be a valid number");
      return;
    }

    // Parse limits
    const listingsLimit = formData.isUnlimitedListings ? -1 : parseInt(formData.listingsLimit) || 0;
    const deliveriesLimit = formData.isUnlimitedDeliveries ? -1 : parseInt(formData.deliveriesLimit) || 0;

    const planData = {
      name: formData.name,
      description: formData.description,
      price,
      durationType: formData.durationType,
      capabilities: {
        canSell: formData.canSell,
        canDeliver: formData.canDeliver,
      },
      limits: {
        listings: listingsLimit,
        deliveries: deliveriesLimit,
      },
      features: formData.features.split("\n").filter(f => f.trim()),
      isActive: formData.isActive,
    };

    setIsLoading(true);
    try {
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.planId, planData);
        toast.success(`Plan "${planData.name}" updated successfully`);
      } else {
        await createSubscriptionPlan(planData);
        toast.success(`Plan "${planData.name}" created successfully`);
      }
      setIsDialogOpen(false);
      fetchAllSubscriptionPlans(); // Refresh the list
    } catch (error) {
      toast.error("Failed to save plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (planId: string, planName: string) => {
    if (confirm(`Are you sure you want to delete "${planName}"?`)) {
      try {
        await deleteSubscriptionPlan(planId);
        toast.success(`Plan "${planName}" deleted`);
        fetchAllSubscriptionPlans();
      } catch (error) {
        toast.error("Failed to delete plan");
      }
    }
  };

  const formatDuration = (type: string) => {
    const labels: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Subscription Plans</h1>
          <p className="text-muted-foreground text-sm">Configure subscription plans with pricing, duration, and capabilities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-hero text-primary-foreground" onClick={openNewPlan}>
              <Plus className="w-4 h-4 mr-2" /> New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label>Plan Name *</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Vendor Basic, Logistics Pro" 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Brief description of this plan"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (KES) *</Label>
                  <Input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    placeholder="499" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <Select 
                    value={formData.durationType} 
                    onValueChange={(v: any) => setFormData({...formData, durationType: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                      <SelectItem value="quarterly">Quarterly (90 days)</SelectItem>
                      <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Capabilities */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="font-semibold">Capabilities</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Can Sell (Vendor features)</span>
                  </div>
                  <Switch 
                    checked={formData.canSell}
                    onCheckedChange={(v) => setFormData({...formData, canSell: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Can Deliver (Logistics features)</span>
                  </div>
                  <Switch 
                    checked={formData.canDeliver}
                    onCheckedChange={(v) => setFormData({...formData, canDeliver: v})}
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="font-semibold">Usage Limits</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Listings Limit</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Unlimited</span>
                      <Switch 
                        checked={formData.isUnlimitedListings}
                        onCheckedChange={(v) => setFormData({...formData, isUnlimitedListings: v})}
                      />
                    </div>
                  </div>
                  {!formData.isUnlimitedListings && (
                    <Input 
                      type="number"
                      value={formData.listingsLimit}
                      onChange={e => setFormData({...formData, listingsLimit: e.target.value})}
                      placeholder="20"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Deliveries Limit</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Unlimited</span>
                      <Switch 
                        checked={formData.isUnlimitedDeliveries}
                        onCheckedChange={(v) => setFormData({...formData, isUnlimitedDeliveries: v})}
                      />
                    </div>
                  </div>
                  {!formData.isUnlimitedDeliveries && (
                    <Input 
                      type="number"
                      value={formData.deliveriesLimit}
                      onChange={e => setFormData({...formData, deliveriesLimit: e.target.value})}
                      placeholder="50"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea 
                  value={formData.features} 
                  onChange={e => setFormData({...formData, features: e.target.value})} 
                  placeholder="Up to 20 listings/month&#10;Basic analytics&#10;Email support&#10;Priority listing"
                  rows={4} 
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <Label className="font-semibold">Active</Label>
                <Switch 
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({...formData, isActive: v})}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="bg-gradient-hero text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {subscriptionPlans.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No subscription plans configured yet.</p>
          <Button onClick={openNewPlan} variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" /> Create your first plan
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subscriptionPlans.map((plan) => (
            <Card key={plan.planId} className={`p-5 space-y-4 ${!plan.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-lg">{plan.name}</h3>
                  {!plan.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex gap-1">
                  <button 
                    className="p-1.5 rounded-lg hover:bg-muted" 
                    onClick={() => openEditPlan(plan)} 
                    title="Edit plan"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button 
                    className="p-1.5 rounded-lg hover:bg-destructive/10" 
                    onClick={() => handleDelete(plan.planId, plan.name)} 
                    title="Delete plan"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
              
              <div>
                <p className="font-heading font-bold text-2xl text-primary">
                  KES {plan.price.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDuration(plan.durationType)}
                </p>
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-2">
                {plan.capabilities?.canSell && (
                  <Badge className="bg-green-100 text-green-700">
                    <Store className="w-3 h-3 mr-1" /> Sell
                  </Badge>
                )}
                {plan.capabilities?.canDeliver && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Truck className="w-3 h-3 mr-1" /> Deliver
                  </Badge>
                )}
              </div>

              {/* Limits */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">
                  {plan.limits?.listings === -1 ? (
                    <span className="flex items-center gap-1">
                      <Infinity className="w-3 h-3" /> Unlimited listings
                    </span>
                  ) : (
                    `${plan.limits?.listings || 0} listings`
                  )}
                </Badge>
                <Badge variant="outline">
                  {plan.limits?.deliveries === -1 ? (
                    <span className="flex items-center gap-1">
                      <Infinity className="w-3 h-3" /> Unlimited deliveries
                    </span>
                  ) : (
                    `${plan.limits?.deliveries || 0} deliveries`
                  )}
                </Badge>
              </div>

              <ul className="space-y-1.5">
                {(plan.features ?? []).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3 h-3 text-green-500" /> {f}
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground font-mono">ID: {plan.planId}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
