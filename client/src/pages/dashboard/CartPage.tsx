import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, Trash2, MapPin, Truck, Package,
  Loader2, Wallet, Smartphone, ChevronRight,
  ShoppingBag, CheckCircle2, AlertCircle, ArrowLeft,
  Receipt, Info,
} from "lucide-react";
import LocationPicker, { LocationValue } from "@/components/LocationPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function CartPage() {
  const navigate = useNavigate();
  const { fetchListings, fetchTransactions } = useData();
  const {
    cartItems, removeFromCart, updateQuantity,
    updateDeliveryLocation, getCartTotal, clearCart,
  } = useCart();
  const { user, updateAuthUser } = useAuth();

  // Per-item fulfillment mode (overrides what was set on listing details)
  const [fulfillmentModes, setFulfillmentModes] = useState<Record<string, "Pickup" | "Delivery">>(() =>
    Object.fromEntries(cartItems.map(i => [i.listing.id, i.fulfillmentMode]))
  );

  // Per-item fee loading state & breakdown
  const [feeLoading, setFeeLoading] = useState<Record<string, boolean>>({});
  const [feeBreakdown, setFeeBreakdown] = useState<Record<string, { distanceKm: number; gross: number; platform: number; riderNet: number }>>({});

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "mpesa">("wallet");
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || "");
  const [processing, setProcessing] = useState(false);

  const itemCount = cartItems.reduce((t, i) => t + i.quantity, 0);

  const effectiveMode = (id: string): "Pickup" | "Delivery" =>
    fulfillmentModes[id] ?? "Pickup";

  const setMode = (id: string, mode: "Pickup" | "Delivery") => {
    setFulfillmentModes(prev => ({ ...prev, [id]: mode }));
    if (mode === "Pickup") {
      // clear delivery location when switching back to pickup
      updateDeliveryLocation(id, { lat: 0, lng: 0, address: "" }, 0);
    }
  };

  // ── Delivery fee helpers ────────────────────────────────────────
  const handleLocationPicked = async (listingId: string, listing: any, loc: LocationValue) => {
    if (!loc.address.trim()) return;
    if (!listing?.location?.lat || !listing?.location?.lng) {
      updateDeliveryLocation(listingId, loc, 150);
      return;
    }
    setFeeLoading(prev => ({ ...prev, [listingId]: true }));
    try {
      const data: any = await apiClient.get(
        `/transactions/price-delivery?fromLat=${listing.location.lat}&fromLng=${listing.location.lng}&toLat=${loc.lat}&toLng=${loc.lng}`
      );
      const fee = data?.gross ?? 150;
      updateDeliveryLocation(listingId, loc, fee);
      if (data?.gross) {
        setFeeBreakdown(prev => ({ ...prev, [listingId]: {
          distanceKm: data.distanceKm,
          gross: data.gross,
          platform: data.platform,
          riderNet: data.riderNet,
        }}));
      }
      // Save delivery location to user profile so it pre-fills next time
      try {
        const res: any = await apiClient.put('/users/me', { location: loc });
        if (res?.user) updateAuthUser({ location: res.user.location });
      } catch { /* non-critical */ }
    } catch {
      updateDeliveryLocation(listingId, loc, 150);
    } finally {
      setFeeLoading(prev => ({ ...prev, [listingId]: false }));
    }
  };

  // ── Cart total using effective modes ───────────────────────────
  const cartTotal = cartItems.reduce((sum, item) => {
    const mode = effectiveMode(item.listing.id);
    const fee  = mode === "Delivery" ? (item.deliveryFee || 0) : 0;
    return sum + (item.listing.price * item.quantity) + fee;
  }, 0);

  // Delivery items (using effective mode) that still need a location
  const missingLocation = cartItems.filter(item => {
    if (effectiveMode(item.listing.id) !== "Delivery") return false;
    return !item.deliveryLocation?.address?.trim();
  });

  // ── Checkout ───────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (missingLocation.length > 0) {
      toast.error(`${missingLocation.length} delivery item(s) still need a location`);
      return;
    }
    setProcessing(true);
    try {
      const payload = {
        items: cartItems.map(item => ({
          listingId: item.listing.id,
          quantity: item.quantity,
          fulfillmentMode: effectiveMode(item.listing.id),
          deliveryFee: effectiveMode(item.listing.id) === "Delivery" ? (item.deliveryFee || 0) : 0,
          deliveryLocation: effectiveMode(item.listing.id) === "Delivery"
            ? (item.deliveryLocation ?? null) : null,
        })),
        phoneNumber: paymentMethod === "mpesa" ? mpesaPhone : undefined,
      };

      const res: any = await apiClient.post("/transactions/checkout", payload);

      // Wallet payment — instant
      if (paymentMethod === "wallet") {
        if (res?.walletBalance !== undefined) updateAuthUser({ walletBalance: res.walletBalance });
        toast.success("Checkout successful!", { description: `${itemCount} item(s) ordered.` });
        clearCart();
        setPaymentOpen(false);
        await Promise.all([fetchListings(), fetchTransactions()]);
        setTimeout(() => navigate("/dashboard/orders"), 1200);
        return;
      }

      // M-Pesa — wait for payment confirmation before proceeding
      const orderGroupId = res?.orderGroup?._id;
      if (!orderGroupId) throw new Error("Order was not created. Please try again.");

      toast.info("STK Push sent — enter your M-Pesa PIN on your phone.");

      let attempts = 0;
      const maxAttempts = 30; // 2 minutes (30 × 4s)
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes: any = await apiClient.get(`/transactions/order-group/${orderGroupId}/payment-status`);
          if (statusRes.paymentStatus === 'completed') {
            clearInterval(poll);
            setProcessing(false);
            toast.success("Payment confirmed!", { description: `${itemCount} item(s) ordered.` });
            clearCart();
            setPaymentOpen(false);
            await Promise.all([fetchListings(), fetchTransactions()]);
            setTimeout(() => navigate("/dashboard/orders"), 1200);
          } else if (statusRes.paymentStatus === 'failed') {
            clearInterval(poll);
            setProcessing(false);
            toast.error("Payment failed. Your order has been cancelled. Please try again.");
            await fetchListings();
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            // Final check before giving up
            try {
              const finalRes: any = await apiClient.get(`/transactions/order-group/${orderGroupId}/payment-status`);
              if (finalRes.paymentStatus === 'completed') {
                setProcessing(false);
                toast.success("Payment confirmed!", { description: `${itemCount} item(s) ordered.` });
                clearCart();
                setPaymentOpen(false);
                await Promise.all([fetchListings(), fetchTransactions()]);
                setTimeout(() => navigate("/dashboard/orders"), 1200);
                return;
              }
            } catch {}
            setProcessing(false);
            toast.info("Checking order status...", { description: "Redirecting to your orders page." });
            clearCart();
            setPaymentOpen(false);
            await fetchTransactions();
            setTimeout(() => navigate("/dashboard/orders"), 1000);
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            setProcessing(false);
            toast.info("Checking order status...", { description: "Redirecting to your orders page." });
            clearCart();
            setPaymentOpen(false);
            setTimeout(() => navigate("/dashboard/orders"), 1000);
          }
        }
      }, 4000);

    } catch (err: any) {
      toast.error(err.message || "Checkout failed. Please try again.");
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <h2 className="font-heading font-bold text-xl">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm">Discover fresh food listings near you</p>
        </div>
        <Button onClick={() => navigate("/dashboard/map")} className="gap-2">
          <MapPin className="w-4 h-4" /> Browse Listings
        </Button>
      </div>
    );
  }

  const itemsTotal = cartItems.reduce((s, i) => s + i.listing.price * i.quantity, 0);
  const deliveryTotal = cartItems.reduce((s, i) =>
    effectiveMode(i.listing.id) === "Delivery" ? s + (i.deliveryFee || 0) : s, 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-heading font-bold text-2xl leading-none">Checkout</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{itemCount} item{itemCount !== 1 ? "s" : ""} in your cart</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── LEFT COLUMN: Cart items ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {cartItems.map((item, idx) => {
            const mode    = effectiveMode(item.listing.id);
            const hasLoc  = !!item.deliveryLocation?.address?.trim();
            const loading = feeLoading[item.listing.id];
            const fee     = mode === "Delivery" ? (item.deliveryFee || 0) : 0;
            const lineTotal = (item.listing.price * item.quantity) + fee;
            const bd = feeBreakdown[item.listing.id];

            return (
              <Card key={item.listing.id} className="overflow-hidden border-border/60 shadow-sm">
                {/* Card top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

                <div className="p-5 space-y-5">
                  {/* Item row */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 font-heading font-bold text-primary text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-base leading-tight line-clamp-1">{item.listing.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">by {item.listing.vendorName}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {item.listing.price > 0
                          ? <span className="text-xs font-medium text-muted-foreground">KES {item.listing.price.toLocaleString()} / unit</span>
                          : <Badge variant="secondary" className="text-[10px]">Free</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                      <button
                        onClick={() => removeFromCart(item.listing.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-heading font-bold text-primary text-base">KES {lineTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Quantity + fulfillment in one row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantity</p>
                      <div className="flex items-center gap-0 border border-border rounded-xl overflow-hidden w-fit">
                        <button
                          className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-lg font-medium disabled:opacity-40"
                          onClick={() => updateQuantity(item.listing.id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                        >−</button>
                        <span className="w-10 text-center text-sm font-bold border-x border-border h-9 flex items-center justify-center">{item.quantity}</span>
                        <button
                          className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-lg font-medium disabled:opacity-40"
                          onClick={() => updateQuantity(item.listing.id, Math.min(item.listing.quantity, item.quantity + 1))}
                          disabled={item.quantity >= item.listing.quantity}
                        >+</button>
                      </div>
                    </div>

                    {/* Fulfillment */}
                    <div className="flex-1 space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fulfillment</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setMode(item.listing.id, "Pickup")}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            mode === "Pickup"
                              ? "border-primary bg-primary/8 text-primary shadow-sm"
                              : "border-border text-muted-foreground hover:border-muted-foreground/60"
                          }`}
                        >
                          <Package className="w-4 h-4 shrink-0" />
                          Self Pickup
                          {mode === "Pickup" && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                        <button
                          onClick={() => setMode(item.listing.id, "Delivery")}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            mode === "Delivery"
                              ? "border-primary bg-primary/8 text-primary shadow-sm"
                              : "border-border text-muted-foreground hover:border-muted-foreground/60"
                          }`}
                        >
                          <Truck className="w-4 h-4 shrink-0" />
                          Delivery
                          {mode === "Delivery" && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delivery location section */}
                  {mode === "Delivery" && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> Delivery Location
                        </p>
                        {!hasLoc && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Required
                          </span>
                        )}
                        {hasLoc && (
                          <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Location set
                          </span>
                        )}
                      </div>

                      <LocationPicker
                        label=""
                        height="200px"
                        value={
                          hasLoc
                            ? item.deliveryLocation!
                            : (user?.location?.lat && user?.location?.address)
                              ? { lat: user.location.lat, lng: user.location.lng!, address: user.location.address! }
                              : { lat: -1.2921, lng: 36.8219, address: "" }
                        }
                        onChange={(loc) => handleLocationPicked(item.listing.id, item.listing, loc)}
                      />

                      {loading && (
                        <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Calculating delivery fee…
                        </div>
                      )}

                      {hasLoc && bd && (
                        <div className="rounded-xl overflow-hidden border border-border/60">
                          <div className="bg-muted/60 px-4 py-2.5 flex items-center gap-2">
                            <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery Fee Breakdown</span>
                          </div>
                          <div className="px-4 py-3 space-y-2 text-sm bg-card">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Distance</span>
                              <span className="font-medium">{bd.distanceKm} km</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Base fare</span>
                              <span className="font-medium">KES 50</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Distance charge</span>
                              <span className="font-medium">KES {bd.gross - 50}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-xs text-muted-foreground/70">
                              <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Platform fee (10%)</span>
                              <span>KES {bd.platform}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground/70">
                              <span>Rider payout (90%)</span>
                              <span>KES {bd.riderNet}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-semibold text-primary">
                              <span>Delivery fee</span>
                              <span>KES {bd.gross}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* ── RIGHT COLUMN: Order summary ── */}
        <div className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-4">
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <div className="bg-gradient-to-br from-primary to-primary/80 px-5 py-4">
              <h2 className="font-heading font-bold text-white text-lg">Order Summary</h2>
              <p className="text-primary-foreground/70 text-xs mt-0.5">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Line items */}
              <div className="space-y-2.5">
                {cartItems.map(item => (
                  <div key={item.listing.id} className="flex justify-between items-start text-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium line-clamp-1 text-sm">{item.listing.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × KES {item.listing.price}
                        {effectiveMode(item.listing.id) === "Delivery" && (
                          <span className="ml-1 text-primary">+ delivery</span>
                        )}
                      </p>
                    </div>
                    <span className="font-semibold text-sm shrink-0">
                      KES {((item.listing.price * item.quantity) + (effectiveMode(item.listing.id) === "Delivery" ? (item.deliveryFee || 0) : 0)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items subtotal</span>
                  <span>KES {itemsTotal.toLocaleString()}</span>
                </div>
                {deliveryTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Delivery</span>
                    <span>KES {deliveryTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center px-4 py-3 bg-muted/60 rounded-xl">
                <span className="font-heading font-bold">Total</span>
                <span className="font-heading font-bold text-xl text-primary">KES {cartTotal.toLocaleString()}</span>
              </div>

              {missingLocation.length > 0 && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {missingLocation.length === 1
                      ? "Pin a delivery location on the map above to continue"
                      : `${missingLocation.length} items need delivery locations`}
                  </span>
                </div>
              )}

              <Button
                className="w-full h-12 font-semibold gap-2 bg-gradient-hero text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                disabled={missingLocation.length > 0}
                onClick={() => setPaymentOpen(true)}
              >
                Proceed to Payment <ChevronRight className="w-4 h-4" />
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Secure checkout · Cancel anytime
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Payment dialog ── */}
      <Dialog open={paymentOpen} onOpenChange={(o) => !processing && setPaymentOpen(o)}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-5">
            <DialogTitle className="text-white font-heading text-xl">Complete Payment</DialogTitle>
            <DialogDescription className="text-primary-foreground/70 text-sm mt-1">
              Total due: <span className="font-bold text-white text-base">KES {cartTotal.toLocaleString()}</span>
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Method pills */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === "wallet"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  {paymentMethod === "wallet" && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === "wallet" ? "bg-primary/10" : "bg-muted"}`}>
                    <Wallet className={`w-5 h-5 ${paymentMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-sm font-semibold ${paymentMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`}>Wallet</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("mpesa")}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === "mpesa"
                      ? "border-[#52B44B] bg-[#52B44B]/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  {paymentMethod === "mpesa" && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#52B44B] flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === "mpesa" ? "bg-[#52B44B]/10" : "bg-muted"}`}>
                    <Smartphone className={`w-5 h-5 ${paymentMethod === "mpesa" ? "text-[#52B44B]" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-sm font-semibold ${paymentMethod === "mpesa" ? "text-[#52B44B]" : "text-muted-foreground"}`}>M-Pesa</span>
                </button>
              </div>
            </div>

            {/* Method detail */}
            {paymentMethod === "wallet" ? (
              <div className="flex items-center justify-between px-4 py-3.5 bg-muted/60 rounded-xl border border-border/60">
                <div>
                  <p className="text-xs text-muted-foreground">Available balance</p>
                  <p className={`font-bold text-base mt-0.5 ${(user?.walletBalance || 0) >= cartTotal ? "text-green-600" : "text-destructive"}`}>
                    KES {(user?.walletBalance || 0).toLocaleString()}
                  </p>
                </div>
                {(user?.walletBalance || 0) >= cartTotal
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <AlertCircle className="w-5 h-5 text-destructive" />}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">M-Pesa Number</label>
                <input
                  className="flex h-11 w-full rounded-xl border border-input bg-muted px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={mpesaPhone}
                  onChange={e => setMpesaPhone(e.target.value)}
                />
              </div>
            )}

            {processing && (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                <span className="text-muted-foreground">
                  {paymentMethod === "mpesa" ? "Check your phone and enter your M-Pesa PIN…" : "Processing payment…"}
                </span>
              </div>
            )}

            <Button
              className={`w-full h-12 font-semibold rounded-xl gap-2 ${
                paymentMethod === "mpesa"
                  ? "bg-[#52B44B] hover:bg-[#52B44B]/90 text-white"
                  : "bg-gradient-hero text-primary-foreground"
              }`}
              disabled={processing || (paymentMethod === "wallet" && (user?.walletBalance || 0) < cartTotal)}
              onClick={handleCheckout}
            >
              {processing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                : <><CheckCircle2 className="w-4 h-4" /> Confirm Payment</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
