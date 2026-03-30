import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { categories } from "@/data/sampleData";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function CreateListing() {
  const navigate = useNavigate();
  const [isFree, setIsFree] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Listing created successfully!");
    navigate("/vendor/listings");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading font-bold text-2xl">Create Listing</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input placeholder="e.g. Fresh Sukuma Wiki Bundle" required />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Describe the food item, condition, and any notes..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" placeholder="10" min={1} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input placeholder="e.g. bundles, kg, servings" />
            </div>
            <div className="space-y-1.5">
              <Label>Price (KES)</Label>
              <Input type="number" placeholder="0" disabled={isFree} />
            </div>
          </div>

          <div className="flex items-center justify-between bg-muted rounded-xl p-4">
            <div>
              <p className="font-medium text-sm">Free Listing</p>
              <p className="text-xs text-muted-foreground">Offer this item for free</p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pickup Start</Label>
              <Input type="time" defaultValue="08:00" />
            </div>
            <div className="space-y-1.5">
              <Label>Pickup End</Label>
              <Input type="time" defaultValue="18:00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Expiry Date & Time</Label>
            <Input type="datetime-local" />
          </div>

          <div className="space-y-1.5">
            <Label>Location / Address</Label>
            <Input placeholder="e.g. Westlands, Nairobi" />
          </div>

          <div className="flex items-center justify-between bg-muted rounded-xl p-4">
            <div>
              <p className="font-medium text-sm">Allow Delivery</p>
              <p className="text-xs text-muted-foreground">Recipients can request delivery</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Button type="submit" className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12">
            Publish Listing
          </Button>
        </form>
      </Card>
    </div>
  );
}
