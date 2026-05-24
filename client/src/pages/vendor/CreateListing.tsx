import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { categories } from "@/data/sampleData";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { apiClient } from "@/lib/apiClient";
import LocationPicker, { LocationValue } from "@/components/LocationPicker";
import { Maximize2, Minimize2, ShieldOff } from "lucide-react";

const UNITS = [
  "kg", "g", "litres", "ml",
  "pieces", "bundles", "packets", "boxes",
  "trays", "crates", "bags", "loaves",
  "portions", "servings", "bottles", "cans",
];

const CATEGORY_EMOJI: Record<string, string> = {
  Vegetables: "🥬", Fruits: "🥭", Bakery: "🍞", Dairy: "🥛",
  Grains: "🌾", "Cooked Meals": "🍛", Beverages: "🧃", Other: "📦",
};

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function CreateListing() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const { user, capabilities } = useAuth();
  const { listings, fetchListings } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [locationValue, setLocationValue] = useState<LocationValue>({ lat: -1.2921, lng: 36.8219, address: "" });
  const [deliveryAllowed, setDeliveryAllowed] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const listing = listings.find((l) => l.id === id);
    if (!listing) return;

    setTitle(listing.title);
    setDescription(listing.description);
    setCategory(listing.category);
    setQuantity((listing as any).originalQuantity ?? listing.quantity);
    setUnit(listing.unit);
    setPrice(listing.price ?? 0);
    setIsFree(listing.isFree ?? false);
    setPickupStart(listing.pickupStart ?? "08:00");
    setPickupEnd(listing.pickupEnd ?? "18:00");
    // Convert ISO expiry to datetime-local format (strip seconds/timezone)
    if (listing.expiryDateTime) {
      const iso = new Date(listing.expiryDateTime).toISOString();
      setExpiryDateTime(iso.slice(0, 16));
    }
    if (listing.location) {
      setLocationValue({ lat: listing.location.lat, lng: listing.location.lng, address: listing.location.address });
    }
    setDeliveryAllowed(listing.deliveryAllowed ?? true);
  }, [isEditMode, id, listings]);

  const nowMinStr = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !unit.trim() || !expiryDateTime || !locationValue.address.trim()) {
      toast.error("Please complete all required fields before publishing.");
      return;
    }
    if (new Date(expiryDateTime).getTime() <= Date.now()) {
      toast.error("Expiry date must be in the future.");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      quantity: Number(quantity),
      originalQuantity: Number(quantity),
      availableQuantity: Number(quantity),
      unit: unit.trim(),
      price: isFree ? 0 : Number(price),
      isFree,
      category,
      pickupStart,
      pickupEnd,
      expiryDateTime,
      deliveryAllowed,
      location: { lat: locationValue.lat, lng: locationValue.lng, address: locationValue.address.trim() },
      images: [],
    };
    try {
      if (isEditMode) {
        await apiClient.put(`/listings/${id}`, payload);
        toast.success("Listing updated successfully!");
      } else {
        await apiClient.post("/listings", payload);
        toast.success("Listing published successfully!");
      }
      await fetchListings();
      navigate("/dashboard/sell/listings");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isEditMode ? "Failed to update listing" : "Failed to publish listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!capabilities.canSell) {
    return (
      <div className="max-w-[2500px] mx-auto">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl tracking-tight">
            {isEditMode ? "Edit Listing" : "Create Listing"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Publish surplus food for your community</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <ShieldOff className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-lg">Selling permission required</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Your current subscription does not include the ability to create listings.
              Please upgrade to a plan that includes selling capabilities.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard/subscription")}
            className="mt-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Subscription Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2500px] mx-auto">

      {/* Page title */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl tracking-tight">
          {isEditMode ? "Edit Listing" : "Create Listing"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isEditMode ? "Update the details of your listing" : "Publish surplus food for your community"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── ITEM DETAILS ── */}
        <Divider label="Item Details" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
          <Field label="Title" required>
            <Input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fresh Sukuma Wiki Bundle"
              className="h-10" required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_EMOJI[c] ?? "📦"} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantity" required>
              <Input type="number" value={quantity} min={1}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-10" required />
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label="Description" required>
              <Textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the food item — freshness, packaging, any special notes…"
                rows={3} className="resize-none" required
              />
            </Field>
          </div>
        </div>

        {/* ── PRICING ── */}
        <Divider label="Pricing" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-5 items-start">
          <Field label="Unit" required>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Price per unit (KES)">
            <Input type="number" value={price} min={0}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="0" disabled={isFree} className="h-10" />
          </Field>

          <div className="flex items-center justify-between h-10 mt-6 px-4 rounded-lg border border-border bg-muted/40">
            <div>
              <p className="text-sm font-medium leading-none">Free listing</p>
              <p className="text-xs text-muted-foreground mt-0.5">No cost to recipient</p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>
        </div>

        {/* ── AVAILABILITY ── */}
        <Divider label="Availability" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-5">
          <Field label="Pickup Window Start">
            <Input type="time" value={pickupStart}
              onChange={(e) => setPickupStart(e.target.value)} className="h-10" />
          </Field>
          <Field label="Pickup Window End">
            <Input type="time" value={pickupEnd}
              onChange={(e) => setPickupEnd(e.target.value)} className="h-10" />
          </Field>
          <Field label="Expiry Date & Time" required hint="Must be a future date and time">
            <Input type="datetime-local" value={expiryDateTime}
              min={nowMinStr}
              onChange={(e) => setExpiryDateTime(e.target.value)} className="h-10" required />
          </Field>
        </div>

        {/* ── LOCATION ── */}
        <Divider label="Pickup Location" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Search an address or click the map to pin the exact pickup point</p>
            <button
              type="button"
              onClick={() => setMapFullscreen(!mapFullscreen)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md border border-border hover:bg-muted"
            >
              {mapFullscreen
                ? <><Minimize2 className="w-3 h-3" /> Shrink</>
                : <><Maximize2 className="w-3 h-3" /> Expand</>}
            </button>
          </div>
          <LocationPicker
            label=""
            value={locationValue}
            onChange={setLocationValue}
            height={mapFullscreen ? "520px" : "280px"}
          />
        </div>

        {/* ── DELIVERY ── */}
        <Divider label="Delivery" />

        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium">Allow delivery</p>
            <p className="text-xs text-muted-foreground mt-0.5">Recipients can request home delivery for this listing</p>
          </div>
          <Switch checked={deliveryAllowed} onCheckedChange={setDeliveryAllowed} />
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-4">
          <Button type="button" variant="outline" className="sm:w-36 h-11"
            onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}
            className="flex-1 h-11 bg-gradient-hero text-primary-foreground font-semibold tracking-wide">
            {isSubmitting
              ? (isEditMode ? "Saving…" : "Publishing…")
              : (isEditMode ? "Save Changes" : "Publish Listing")}
          </Button>
        </div>

      </form>
    </div>
  );
}
