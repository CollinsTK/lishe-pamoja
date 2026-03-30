import { useParams, useNavigate } from "react-router-dom";
import { sampleListings } from "@/data/sampleData";
import { useExpiryCountdown } from "@/hooks/useExpiryCountdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, MapPin, Truck, Gift, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = sampleListings.find((l) => l.id === id);
  const [fulfillment, setFulfillment] = useState<"Pickup" | "Delivery">("Pickup");

  if (!listing) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Listing not found</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-2">Go Back</Button>
      </div>
    );
  }

  const { timeLeft, isUrgent, isExpired } = useExpiryCountdown(listing.expiryDateTime);
  const logisticsFee = 150;

  const handleClaim = () => {
    toast.success(listing.isFree ? "Item claimed successfully!" : "Order placed successfully!", {
      description: `${fulfillment === "Delivery" ? "Delivery will be arranged." : "Ready for pickup."}`
    });
    navigate("/orders");
  };

  return (
    <div className="pb-6">
      {/* Image area */}
      <div className="relative h-56 bg-muted flex items-center justify-center text-6xl">
        {listing.category === "Vegetables" && "🥬"}
        {listing.category === "Bakery" && "🍞"}
        {listing.category === "Fruits" && "🥭"}
        {listing.category === "Cooked Meals" && "🍛"}
        {listing.category === "Dairy" && "🥛"}
        {listing.category === "Grains" && "🌾"}

        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-full bg-card/80 backdrop-blur">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Badge
          variant={isExpired ? "destructive" : isUrgent ? "destructive" : "outline"}
          className={`absolute top-4 right-4 font-mono ${isUrgent && !isExpired ? "animate-pulse" : ""}`}
        >
          <Clock className="w-3 h-3 mr-1" /> {timeLeft}
        </Badge>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Title & Price */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading font-bold text-xl">{listing.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <User className="w-3 h-3" /> {listing.vendorName}
            </p>
          </div>
          {listing.isFree ? (
            <Badge className="bg-primary text-primary-foreground text-sm px-3"><Gift className="w-3 h-3 mr-1" /> Free</Badge>
          ) : (
            <span className="font-heading font-bold text-xl text-primary">KES {listing.price}</span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <p className="text-foreground/80">{listing.description}</p>
          <div className="flex flex-wrap gap-3 text-muted-foreground">
            <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {listing.quantity} {listing.unit}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {listing.location.address}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pickup: {listing.pickupStart} – {listing.pickupEnd}</span>
          </div>
        </div>

        {/* Fulfillment selection */}
        <div className="space-y-2">
          <p className="font-heading font-semibold text-sm">Fulfillment</p>
          <div className="grid grid-cols-2 gap-2">
            <button
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
        </div>

        {/* Price Summary */}
        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base price</span>
            <span>KES {listing.isFree ? 0 : listing.price}</span>
          </div>
          {fulfillment === "Delivery" && (
            <div className="flex justify-between text-sm">
              <span>Logistics fee</span>
              <span>KES {logisticsFee}</span>
            </div>
          )}
          <div className="flex justify-between font-heading font-bold border-t pt-2">
            <span>Total</span>
            <span className="text-primary">
              KES {(listing.isFree ? 0 : listing.price) + (fulfillment === "Delivery" ? logisticsFee : 0)}
            </span>
          </div>
        </div>

        <Button
          onClick={handleClaim}
          disabled={isExpired}
          className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12 text-base"
        >
          {listing.isFree ? "Claim Now" : "Purchase"}
        </Button>
      </div>
    </div>
  );
}
