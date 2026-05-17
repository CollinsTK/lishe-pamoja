import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useExpiryCountdown } from "@/hooks/useExpiryCountdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Clock, MapPin, Truck, Gift, ShoppingBag, User,
  Pencil, Package, Bike, ExternalLink, AlertTriangle, LogIn, Send,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiClient } from "@/lib/apiClient";
import LocationPicker, { LocationValue } from "@/components/LocationPicker";

const CATEGORY_EMOJI: Record<string, string> = {
  Vegetables: "🥬", Fruits: "🥭", Bakery: "🍞", Dairy: "🥛",
  Grains: "🌾", "Cooked Meals": "🍛", Beverages: "🧃", Other: "📦",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  available:         { label: "Available",      cls: "bg-green-500/15 text-green-700 dark:text-green-400" },
  partially_claimed: { label: "Partly Claimed", cls: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  fully_claimed:     { label: "Fully Claimed",  cls: "bg-muted text-muted-foreground" },
  expired:           { label: "Expired",        cls: "bg-destructive/15 text-destructive" },
  cancelled:         { label: "Cancelled",      cls: "bg-muted text-muted-foreground" },
};

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings } = useData();
  const { user, capabilities, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const listing = listings.find((l) => l.id === id);

  const [fulfillment, setFulfillment] = useState<"Pickup" | "Delivery">("Pickup");
  const [orderedQuantity, setOrderedQuantity] = useState(1);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationValue>({
    lat: -1.2921, lng: 36.8219, address: "",
  });
  const [calculatedFee, setCalculatedFee] = useState<{ fee: number; distKm: number } | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [dispatchCount, setDispatchCount] = useState(0);

  useEffect(() => {
    if (fulfillment !== "Delivery") { setCalculatedFee(null); return; }
    if (!deliveryLocation.address.trim()) return;
    if (!listing?.location?.lat || !listing?.location?.lng) return;
    setFeeLoading(true);
    apiClient.get(
      `/transactions/price-delivery?fromLat=${listing.location.lat}&fromLng=${listing.location.lng}&toLat=${deliveryLocation.lat}&toLng=${deliveryLocation.lng}`
    )
      .then((data: any) => {
        if (data?.gross) setCalculatedFee({ fee: data.gross, distKm: data.distanceKm });
      })
      .catch(() => {})
      .finally(() => setFeeLoading(false));
  }, [deliveryLocation, fulfillment, listing?.location?.lat, listing?.location?.lng]);

  useEffect(() => {
    if (!capabilities.canDeliver || !listing) return;
    apiClient.get("/transactions/available-dispatches")
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.transactions ?? []);
        const count = list.filter((t: any) => t.listingId?._id === listing.id || t.listingId === listing.id).length;
        setDispatchCount(count);
      })
      .catch(() => {});
  }, [capabilities.canDeliver, listing?.id]);

  const expiryDateTime = listing?.expiryDateTime ?? "";
  const { timeLeft, isUrgent, isExpired } = useExpiryCountdown(expiryDateTime);

  if (!listing) {
    return (
      <div className="p-8 text-center space-y-3">
        <Package className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Listing not found</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }
  const logisticsFee = calculatedFee?.fee ?? 150;

  // ── Role detection ──────────────────────────────────────────────
  const isOwner = !!user && (user.id === listing.vendorId || isAdmin);
  const isRider = !!user && capabilities.canDeliver && !isOwner;
  const isAuthenticated = !!user;
  // recipients and riders both get the claim/cart form

  const statusCfg = STATUS_LABEL[listing.status] ?? STATUS_LABEL.available;
  const emoji = CATEGORY_EMOJI[listing.category] ?? "📦";

  // ── Add-to-cart handler (shared by recipient + rider) ───────────
  const handleAddToCart = () => {
    if (orderedQuantity < 1 || orderedQuantity > listing.quantity) {
      toast.error(`Please select a valid quantity (1 – ${listing.quantity})`);
      return;
    }
    if (fulfillment === "Delivery" && !deliveryLocation.address.trim()) {
      toast.error("Please pin your delivery location on the map.");
      return;
    }
    addToCart(
      listing,
      orderedQuantity,
      fulfillment,
      fulfillment === "Delivery" ? logisticsFee : 0,
      fulfillment === "Delivery" ? deliveryLocation : undefined,
    );
    toast.success("Added to cart", {
      description: `${orderedQuantity} × ${listing.title} added to your cart.`,
    });
    navigate(-1);
  };

  // ── Shared hero header ──────────────────────────────────────────
  const Hero = () => (
    <div className="relative h-52 bg-muted flex items-center justify-center text-6xl select-none">
      {emoji}
      <button
        aria-label="Go back"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 p-2 rounded-full bg-card/80 backdrop-blur hover:bg-card transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <Badge
        variant={isExpired ? "destructive" : isUrgent ? "destructive" : "outline"}
        className={`absolute top-4 right-4 font-mono ${isUrgent && !isExpired ? "animate-pulse" : ""}`}
      >
        <Clock className="w-3 h-3 mr-1" /> {timeLeft}
      </Badge>
    </div>
  );

  // ── Shared listing info block ───────────────────────────────────
  const ListingInfo = () => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-xl leading-tight">{listing.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <User className="w-3 h-3 shrink-0" /> {listing.vendorName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {listing.isFree ? (
            <Badge className="bg-green-500 text-white text-sm px-3">
              <Gift className="w-3 h-3 mr-1" /> Free
            </Badge>
          ) : (
            <span className="font-heading font-bold text-xl text-primary">
              KES {listing.price}
              <span className="text-sm font-normal text-muted-foreground"> / {listing.unit}</span>
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed">{listing.description}</p>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-3">
        <span className="flex items-center gap-1">
          <ShoppingBag className="w-3 h-3" /> {listing.quantity} {listing.unit} available
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {listing.location.address || "Location TBD"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pickup: {listing.pickupStart} – {listing.pickupEnd}
        </span>
        {listing.deliveryAllowed && (
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3" /> Delivery available
          </span>
        )}
      </div>
    </div>
  );

  // ── Claim / cart form (shared by recipient + rider) ─────────────
  const ClaimForm = () => (
    <div className="space-y-5">
      {/* Fulfillment */}
      <div className="space-y-2">
        <p className="font-semibold text-sm">Fulfillment</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFulfillment("Pickup")}
            className={`p-3 rounded-xl border-2 text-center text-sm transition-all ${
              fulfillment === "Pickup" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <MapPin className="w-5 h-5 mx-auto mb-1" />
            Pickup
            <p className="text-[10px] text-muted-foreground">Free</p>
          </button>
          <button
            type="button"
            onClick={() => listing.deliveryAllowed && setFulfillment("Delivery")}
            disabled={!listing.deliveryAllowed}
            className={`p-3 rounded-xl border-2 text-center text-sm transition-all ${
              fulfillment === "Delivery" ? "border-primary bg-primary/5" : "border-border"
            } ${!listing.deliveryAllowed ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Truck className="w-5 h-5 mx-auto mb-1" />
            Delivery
            <p className="text-[10px] text-muted-foreground">KES {logisticsFee}</p>
          </button>
        </div>
        {fulfillment === "Delivery" && (
          <div className="mt-2 space-y-2">
            <LocationPicker
              label="Delivery Address"
              value={deliveryLocation}
              onChange={setDeliveryLocation}
              height="220px"
            />
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted text-sm">
              <span className="text-muted-foreground">
                {calculatedFee ? `Distance: ${calculatedFee.distKm} km` : feeLoading ? "Calculating…" : "Pin your location to get price"}
              </span>
              <span className="font-bold text-primary">
                {feeLoading ? "…" : calculatedFee ? `KES ${calculatedFee.fee}` : "KES —"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <p className="font-semibold text-sm">Quantity</p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon"
            onClick={() => setOrderedQuantity(Math.max(1, orderedQuantity - 1))}
            disabled={orderedQuantity <= 1}>−
          </Button>
          <span className="font-medium text-lg w-8 text-center">{orderedQuantity}</span>
          <Button variant="outline" size="icon"
            onClick={() => setOrderedQuantity(Math.min(listing.quantity, orderedQuantity + 1))}
            disabled={orderedQuantity >= listing.quantity}>+
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            max {listing.quantity} {listing.unit}
          </span>
        </div>
      </div>

      {/* Price summary */}
      <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Base price ({orderedQuantity} {listing.unit})</span>
          <span>KES {listing.isFree ? 0 : listing.price * orderedQuantity}</span>
        </div>
        {fulfillment === "Delivery" && (
          <div className="flex justify-between">
            <span>Logistics fee</span>
            <span>KES {logisticsFee}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t pt-2">
          <span>Total</span>
          <span className="text-primary">
            KES {(listing.isFree ? 0 : listing.price * orderedQuantity) + (fulfillment === "Delivery" ? logisticsFee : 0)}
          </span>
        </div>
      </div>

      <Button
        onClick={handleAddToCart}
        disabled={isExpired || listing.status === "fully_claimed"}
        className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12 text-base"
      >
        {listing.isFree ? "Claim for Free" : "Add to Cart"}
      </Button>

      {isExpired && (
        <p className="text-center text-xs text-destructive flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3" /> This listing has expired and can no longer be claimed.
        </p>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // OWNER VIEW
  // ════════════════════════════════════════════════════════════════
  if (isOwner) {
    return (
      <div className="pb-8">
        <Hero />
        <div className="px-4 space-y-5 mt-4">
          {/* Owner banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/8 border border-primary/20">
            <div className="p-2 rounded-lg bg-primary/15">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">Your Listing</p>
              <p className="text-xs text-muted-foreground">You created this listing — you cannot claim it</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/dashboard/sell/edit/${listing.id}`)}
              className="shrink-0 gap-1.5 text-xs"
            >
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          </div>

          <ListingInfo />

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Remaining", value: `${listing.quantity} ${listing.unit}` },
              { label: "Status", value: statusCfg.label },
              { label: "Expires", value: timeLeft },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-xl border border-border bg-muted/40">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => navigate("/dashboard/sell/listings")}
          >
            <Pencil className="w-4 h-4 mr-2" /> Go to My Listings
          </Button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // GUEST (not logged in)
  // ════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="pb-8">
        <Hero />
        <div className="px-4 space-y-5 mt-4">
          <ListingInfo />
          <div className="flex flex-col items-center gap-3 py-6 border border-dashed border-border rounded-xl text-center">
            <LogIn className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Sign in to claim this item</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create a free account to browse and claim surplus food</p>
            </div>
            <Button onClick={() => navigate("/auth")} className="mt-1 bg-gradient-hero text-primary-foreground">
              Sign In / Register
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RIDER VIEW (canDeliver, not owner) — can claim + sees delivery callout
  // ════════════════════════════════════════════════════════════════
  if (isRider) {
    return (
      <div className="pb-8">
        <Hero />
        <div className="px-4 space-y-5 mt-4">
          {/* Rider identity banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/8 border border-blue-500/20">
            <div className="p-2 rounded-lg bg-blue-500/15">
              <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Rider View</p>
              <p className="text-xs text-muted-foreground">You can claim this food for yourself below</p>
            </div>
          </div>

          <ListingInfo />

          {/* Claim form — same as recipient */}
          <ClaimForm />

          {/* Dispatch availability callout */}
          <div className={`rounded-xl border p-4 space-y-3 ${dispatchCount > 0 ? "border-blue-500/30 bg-blue-500/5" : "border-border bg-muted/40"}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dispatchCount > 0 ? "bg-blue-500/15" : "bg-muted"}`}>
                <Truck className={`w-4 h-4 ${dispatchCount > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  Delivery dispatches for this listing
                  {dispatchCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {dispatchCount}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dispatchCount > 0
                    ? `${dispatchCount} dispatch${dispatchCount > 1 ? "es" : ""} ready to be claimed for this item`
                    : "No pending dispatch jobs for this listing right now"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {dispatchCount > 0 && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate("/dashboard/deliver/available")}
                >
                  <Send className="w-3 h-3" /> View Available Dispatches
                </Button>
              )}
              <button
                onClick={() => navigate("/dashboard/deliver/active")}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                My Active Dispatches <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RECIPIENT VIEW (default — canBrowse, authenticated, not owner)
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="pb-8">
      <Hero />
      <div className="px-4 space-y-5 mt-4">
        <ListingInfo />
        <ClaimForm />
      </div>
    </div>
  );
}
