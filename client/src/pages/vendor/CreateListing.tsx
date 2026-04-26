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
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

export default function CreateListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addListing } = useData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState(0);
  const [isFree, setIsFree] = useState(false);
  const [pickupStart, setPickupStart] = useState("08:00");
  const [pickupEnd, setPickupEnd] = useState("18:00");
  const [expiryDateTime, setExpiryDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryAllowed, setDeliveryAllowed] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !unit.trim() || !expiryDateTime || !location.trim()) {
      toast.error("Please complete all required fields before publishing.");
      return;
    }

    const listingId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `l_${Date.now()}`;

    addListing({
      id: listingId,
      title: title.trim(),
      description: description.trim(),
      images: [],
      quantity: Number(quantity),
      unit: unit.trim(),
      price: isFree ? 0 : Number(price),
      isFree,
      category,
      pickupStart,
      pickupEnd,
      expiryDateTime,
      deliveryAllowed,
      location: {
        lat: -1.2921,
        lng: 36.8219,
        address: location.trim(),
      },
      status: "Available",
      ownerType: "VendorOwned",
      vendorId: user?.id ?? "vendor-unknown",
      vendorName: user?.name ?? "Your Shop",
      createdAt: new Date().toISOString(),
    });

    toast.success("Listing published successfully!");
    navigate("/vendor/listings");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading font-bold text-2xl">Create Listing</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fresh Sukuma Wiki Bundle"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the food item, condition, and any notes..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. bundles, kg, servings"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Price per unit (KES)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="0"
                disabled={isFree}
                min={0}
              />
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
              <Input type="time" value={pickupStart} onChange={(e) => setPickupStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Pickup End</Label>
              <Input type="time" value={pickupEnd} onChange={(e) => setPickupEnd(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Expiry Date & Time</Label>
            <Input
              type="datetime-local"
              value={expiryDateTime}
              onChange={(e) => setExpiryDateTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Location / Address</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Westlands, Nairobi"
              required
            />
          </div>

          <div className="flex items-center justify-between bg-muted rounded-xl p-4">
            <div>
              <p className="font-medium text-sm">Allow Delivery</p>
              <p className="text-xs text-muted-foreground">Recipients can request delivery</p>
            </div>
            <Switch checked={deliveryAllowed} onCheckedChange={setDeliveryAllowed} />
          </div>

          <Button type="submit" className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12">
            Publish Listing
          </Button>
        </form>
      </Card>
    </div>
  );
}
