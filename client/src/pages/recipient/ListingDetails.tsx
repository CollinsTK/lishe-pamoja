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

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, addOrder, addDispatch, updateListing, updateUserWallet } = useData();
  const { user, updateAuthUser } = useAuth();
  const listing = listings.find((l) => l.id === id);
  const [fulfillment, setFulfillment] = useState<"Pickup" | "Delivery">("Pickup");
  const [orderedQuantity, setOrderedQuantity] = useState(1);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "mpesa">("wallet");
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || "");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
    if (!user) {
      toast.error("Please sign in to place an order.");
      return;
    }

    if (orderedQuantity < 1 || orderedQuantity > listing.quantity) {
      toast.error(`Please select a valid quantity (1 - ${listing.quantity})`);
      return;
    }

    const basePrice = listing.isFree ? 0 : listing.price * orderedQuantity;
    const totalPrice = basePrice + (fulfillment === "Delivery" ? logisticsFee : 0);

    if (totalPrice > 0) {
      setIsPaymentDialogOpen(true);
      return;
    }

    processOrder(basePrice, totalPrice);
  };

  const processOrder = (basePrice: number, totalPrice: number) => {
    if (!user) return;
    const orderId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `o_${Date.now()}`;

    addOrder({
      id: orderId,
      listingId: listing.id,
      listingTitle: listing.title,
      recipientId: user.id,
      vendorId: listing.vendorId,
      orderType: listing.isFree ? "Claim" : "Purchase",
      fulfillmentMode: fulfillment,
      basePrice,
      logisticsFee: fulfillment === "Delivery" ? logisticsFee : 0,
      totalPrice,
      status: "Pending",
      createdAt: new Date().toISOString(),
      orderedQuantity,
      unit: listing.unit,
    });

    const remainingQuantity = listing.quantity - orderedQuantity;
    updateListing(listing.id, {
      quantity: remainingQuantity,
      status: remainingQuantity <= 0 ? (listing.isFree ? "Reserved" : "Sold") : "Available",
    });

    // Credit the vendor's wallet with the base price
    if (basePrice > 0) {
      updateUserWallet(listing.vendorId, basePrice);
    }

    // Create dispatch for delivery orders
    if (fulfillment === "Delivery") {
      const dispatchId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `d_${Date.now()}`;
      const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

      addDispatch({
        id: dispatchId,
        orderId,
        logisticsPartnerId: "",
        status: "Assigned",
        pickupAddress: listing.location.address,
        dropoffAddress: listing.location.address,
        createdAt: new Date().toISOString(),
        pickupPin,
        deliveryPin,
      });
    }

    toast.success(listing.isFree && totalPrice === 0 ? "Item claimed successfully!" : "Payment successful & Order placed!", {
      description: `${fulfillment === "Delivery" ? "Delivery will be arranged." : "Ready for pickup."}`,
    });
    setIsPaymentDialogOpen(false);
    navigate("/orders");
  };

  const handleConfirmPayment = () => {
    const basePrice = listing.isFree ? 0 : listing.price * orderedQuantity;
    const totalPrice = basePrice + (fulfillment === "Delivery" ? logisticsFee : 0);

    if (paymentMethod === "wallet") {
      const balance = user?.walletBalance || 0;
      if (balance < totalPrice) {
        toast.error("Insufficient wallet balance.");
        return;
      }
      // Deduct from wallet
      updateAuthUser({ walletBalance: balance - totalPrice });
      updateUserWallet(user!.id, -totalPrice);
      processOrder(basePrice, totalPrice);
    } else {
      if (!mpesaPhone) {
        toast.error("Please enter M-Pesa phone number.");
        return;
      }
      setIsProcessingPayment(true);
      setTimeout(() => {
        setIsProcessingPayment(false);
        processOrder(basePrice, totalPrice);
      }, 3000);
    }
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
          onClick={handleClaim}
          disabled={isExpired}
          className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12 text-base"
        >
          {listing.isFree && fulfillment === "Pickup" ? "Claim Now" : "Proceed to Payment"}
        </Button>
      </div>

      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => !isProcessingPayment && setIsPaymentDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Choose your payment method for KES {(listing.isFree ? 0 : listing.price * orderedQuantity) + (fulfillment === "Delivery" ? logisticsFee : 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("wallet")}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                  paymentMethod === "wallet" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Wallet className={`w-6 h-6 ${paymentMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold">Wallet</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("mpesa")}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                  paymentMethod === "mpesa" ? "border-success bg-success/5" : "border-border"
                }`}
              >
                <Smartphone className={`w-6 h-6 ${paymentMethod === "mpesa" ? "text-success" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold">M-Pesa</span>
              </button>
            </div>

            {paymentMethod === "wallet" ? (
              <div className="bg-muted p-4 rounded-xl flex justify-between items-center">
                <span className="text-sm font-medium">Available Balance:</span>
                <span className={`font-bold ${user?.walletBalance && user.walletBalance >= ((listing.isFree ? 0 : listing.price * orderedQuantity) + (fulfillment === "Delivery" ? logisticsFee : 0)) ? "text-success" : "text-destructive"}`}>
                  KES {(user?.walletBalance || 0).toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>M-Pesa Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                />
              </div>
            )}

            {isProcessingPayment && (
              <div className="bg-muted p-4 rounded-xl flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-success" />
                Please check your phone and enter your M-Pesa PIN...
              </div>
            )}
          </div>

          <Button
            onClick={handleConfirmPayment}
            disabled={isProcessingPayment || (paymentMethod === "wallet" && (user?.walletBalance || 0) < ((listing.isFree ? 0 : listing.price * orderedQuantity) + (fulfillment === "Delivery" ? logisticsFee : 0)))}
            className={`w-full h-12 font-semibold ${paymentMethod === "mpesa" ? "bg-[#52B44B] hover:bg-[#52B44B]/90 text-white" : ""}`}
          >
            {isProcessingPayment ? "Processing..." : "Confirm Payment"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
