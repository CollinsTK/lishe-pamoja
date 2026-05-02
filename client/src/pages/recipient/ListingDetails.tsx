import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useExpiryCountdown } from "@/hooks/useExpiryCountdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, MapPin, Truck, Gift, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Smartphone, Wallet } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, addOrder, addDispatch, updateListing, updateUserWallet } = useData();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const listing = listings.find((l) => l.id === id);
  const [fulfillment, setFulfillment] = useState<"Pickup" | "Delivery">("Pickup");
  const [orderedQuantity, setOrderedQuantity] = useState(1);

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

  const handleAddToCart = () => {
    if (!user) {
      toast.error("Please sign in to add items to cart.");
      return;
    }

    if (orderedQuantity < 1 || orderedQuantity > listing.quantity) {
      toast.error(`Please select a valid quantity (1 - ${listing.quantity})`);
      return;
    }

    addToCart(listing, orderedQuantity, fulfillment, fulfillment === "Delivery" ? logisticsFee : 0);
    toast.success("Added to cart", {
      description: `${orderedQuantity} x ${listing.title} added to your cart.`
    });
    navigate(-1);
  };

  return (
    <div className="pb-6">
      <div className="relative h-56 bg-muted flex items-center justify-center text-6xl">
        {listing.category === "Vegetables" && "🥬"}
        {listing.category === "Bakery" && "🍞"}
        {listing.category === "Fruits" && "🥭"}
        {listing.category === "Cooked Meals" && "🍛"}
        {listing.category === "Dairy" && "🥛"}
        {listing.category === "Grains" && "🌾"}

        <button aria-label="Go back" onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-full bg-card/80 backdrop-blur">
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
            <span className="font-heading font-bold text-xl text-primary">
              KES {listing.price} <span className="text-sm font-normal text-muted-foreground">/ {listing.unit}</span>
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-foreground/80">{listing.description}</p>
          <div className="flex flex-wrap gap-3 text-muted-foreground">
            <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {listing.quantity} {listing.unit}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {listing.location.address}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pickup: {listing.pickupStart} – {listing.pickupEnd}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-heading font-semibold text-sm">Fulfillment</p>
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
        </div>

        <div className="space-y-2">
          <p className="font-heading font-semibold text-sm">Quantity</p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOrderedQuantity(Math.max(1, orderedQuantity - 1))}
              disabled={orderedQuantity <= 1}
            >
              -
            </Button>
            <span className="font-medium text-lg w-8 text-center">{orderedQuantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOrderedQuantity(Math.min(listing.quantity, orderedQuantity + 1))}
              disabled={orderedQuantity >= listing.quantity}
            >
              +
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              (Max {listing.quantity} {listing.unit})
            </span>
          </div>
        </div>

        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base price ({orderedQuantity} {listing.unit})</span>
            <span>KES {listing.isFree ? 0 : listing.price * orderedQuantity}</span>
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
              KES {(listing.isFree ? 0 : listing.price * orderedQuantity) + (fulfillment === "Delivery" ? logisticsFee : 0)}
            </span>
          </div>
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={isExpired}
          className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12 text-base"
        >
          Add to Cart
        </Button>
      </div>

    </div>
  );
}
