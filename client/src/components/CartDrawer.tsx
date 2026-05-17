import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, MapPin, Truck, LocateFixed, Loader2 as SpinIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Smartphone, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useData } from '@/contexts/DataContext';

interface CartDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CartDrawer({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: CartDrawerProps = {}) {
  const { fetchListings, fetchTransactions } = useData();
  const { cartItems, removeFromCart, updateQuantity, updateDeliveryLocation, getCartTotal, clearCart } = useCart();
  const { user, updateAuthUser } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (v: boolean) => {
    setInternalOpen(v);
    controlledOnOpenChange?.(v);
  };
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "mpesa">("wallet");
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || "");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Per-item address input state (listingId -> address string)
  const [addressInputs, setAddressInputs] = useState<Record<string, string>>({});
  const [feeLoading, setFeeLoading] = useState<Record<string, boolean>>({});

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Delivery items that still need a location
  const missingLocation = cartItems.filter(
    item => item.fulfillmentMode === "Delivery" && !item.deliveryLocation?.address?.trim()
  );

  const fetchFeeForItem = async (listingId: string, listing: any, lat: number, lng: number, address: string) => {
    if (!listing?.location?.lat || !listing?.location?.lng) {
      updateDeliveryLocation(listingId, { lat, lng, address }, 150);
      return;
    }
    setFeeLoading(prev => ({ ...prev, [listingId]: true }));
    try {
      const data: any = await apiClient.get(
        `/transactions/price-delivery?fromLat=${listing.location.lat}&fromLng=${listing.location.lng}&toLat=${lat}&toLng=${lng}`
      );
      updateDeliveryLocation(listingId, { lat, lng, address }, data?.gross ?? 150);
    } catch {
      updateDeliveryLocation(listingId, { lat, lng, address }, 150);
    } finally {
      setFeeLoading(prev => ({ ...prev, [listingId]: false }));
    }
  };

  const handleGeolocate = (listingId: string, listing: any) => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setFeeLoading(prev => ({ ...prev, [listingId]: true }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddressInputs(prev => ({ ...prev, [listingId]: address }));
        await fetchFeeForItem(listingId, listing, lat, lng, address);
      },
      () => {
        toast.error("Could not get your location");
        setFeeLoading(prev => ({ ...prev, [listingId]: false }));
      }
    );
  };

  const handleAddressConfirm = async (listingId: string, listing: any) => {
    const addr = (addressInputs[listingId] || "").trim();
    if (!addr) return;
    setFeeLoading(prev => ({ ...prev, [listingId]: true }));
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`
      );
      const results = await res.json();
      if (!results?.length) { toast.error("Address not found, try being more specific"); setFeeLoading(prev => ({ ...prev, [listingId]: false })); return; }
      const { lat, lon, display_name } = results[0];
      await fetchFeeForItem(listingId, listing, parseFloat(lat), parseFloat(lon), display_name);
    } catch {
      toast.error("Could not find address");
      setFeeLoading(prev => ({ ...prev, [listingId]: false }));
    }
  };

  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
    if (missingLocation.length > 0) {
      toast.error("Set delivery location", { description: `${missingLocation.length} item(s) need a delivery address` });
      return;
    }
    setIsPaymentDialogOpen(true);
    setIsOpen(false);
  };

  const processOrderGroup = async () => {
  try {
    setIsProcessingPayment(true);
    
    const payload = {
      items: cartItems.map(item => ({
        listingId: item.listing.id,
        quantity: item.quantity,
        fulfillmentMode: item.fulfillmentMode,
        deliveryFee: item.deliveryFee,
        deliveryLocation: item.deliveryLocation ?? null,
      })),
      phoneNumber: paymentMethod === 'mpesa' ? mpesaPhone : undefined
    };

    const res: any = await apiClient.post('/transactions/checkout', payload);

    // Wallet payment — instant confirmation
    if (paymentMethod === "wallet") {
      if (res?.walletBalance !== undefined) updateAuthUser({ walletBalance: res.walletBalance });
      toast.success("Checkout Successful!", { description: `Your order for ${itemCount} items has been placed.` });
      clearCart();
      setIsPaymentDialogOpen(false);
      await Promise.all([fetchListings(), fetchTransactions()]);
      setTimeout(() => { window.location.href = '/orders'; }, 1500);
      return;
    }

    // M-Pesa — poll for payment confirmation before showing success
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
          setIsProcessingPayment(false);
          toast.success("Payment confirmed!", { description: `Your order for ${itemCount} items has been placed.` });
          clearCart();
          setIsPaymentDialogOpen(false);
          await Promise.all([fetchListings(), fetchTransactions()]);
          setTimeout(() => { window.location.href = '/orders'; }, 1500);
        } else if (statusRes.paymentStatus === 'failed') {
          clearInterval(poll);
          setIsProcessingPayment(false);
          toast.error("Payment failed. Your order has been cancelled. Please try again.");
          await fetchListings();
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          // Final check before giving up
          try {
            const finalRes: any = await apiClient.get(`/transactions/order-group/${orderGroupId}/payment-status`);
            if (finalRes.paymentStatus === 'completed') {
              setIsProcessingPayment(false);
              toast.success("Payment confirmed!", { description: `Your order for ${itemCount} items has been placed.` });
              clearCart();
              setIsPaymentDialogOpen(false);
              await Promise.all([fetchListings(), fetchTransactions()]);
              setTimeout(() => { window.location.href = '/orders'; }, 1500);
              return;
            }
          } catch {}
          setIsProcessingPayment(false);
          toast.info("Checking order status...", { description: "Redirecting to your orders page." });
          clearCart();
          setIsPaymentDialogOpen(false);
          await fetchTransactions();
          setTimeout(() => { window.location.href = '/orders'; }, 1000);
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setIsProcessingPayment(false);
          toast.info("Checking order status...", { description: "Redirecting to your orders page." });
          clearCart();
          setIsPaymentDialogOpen(false);
          setTimeout(() => { window.location.href = '/orders'; }, 1000);
        }
      }
    }, 4000);
    
  } catch (error: any) {
    toast.error(error.message || "Checkout failed. Please try again.");
    setIsProcessingPayment(false);
  }
};

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button className="relative p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="My Cart">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                {itemCount}
              </Badge>
            )}
          </button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Your Cart ({itemCount})</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p>Your cart is empty.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.listing.id} className="bg-muted/50 p-3 rounded-xl space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <h4 className="font-heading font-semibold text-sm line-clamp-1">{item.listing.title}</h4>
                      <p className="text-xs text-muted-foreground">Vendor: {item.listing.vendorName}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.listing.id, Math.max(1, item.quantity - 1))}>-</Button>
                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.listing.id, Math.min(item.listing.quantity, item.quantity + 1))}>+</Button>
                        <span className="text-xs text-muted-foreground ml-2">x KES {item.listing.price}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.listing.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="text-right mt-2">
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          {item.fulfillmentMode === "Delivery" ? <Truck className="w-3 h-3"/> : <MapPin className="w-3 h-3" />}
                          {item.fulfillmentMode}
                          {item.fulfillmentMode === "Delivery" && item.deliveryFee > 0 && ` (+KES ${item.deliveryFee})`}
                        </p>
                        <p className="font-semibold text-primary mt-1">
                          KES {(item.listing.price * item.quantity) + item.deliveryFee}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery location setter */}
                  {item.fulfillmentMode === "Delivery" && (
                    <div className="space-y-1.5 pt-1 border-t border-border/50">
                      {item.deliveryLocation?.address ? (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground line-clamp-2 flex-1">{item.deliveryLocation.address}</p>
                          <button
                            className="text-[10px] text-primary underline shrink-0"
                            onClick={() => updateDeliveryLocation(item.listing.id, { lat: 0, lng: 0, address: "" }, 0)}
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Set your delivery location
                          </p>
                          <div className="flex gap-1.5">
                            <input
                              className="flex-1 h-8 rounded-lg border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="Type address…"
                              value={addressInputs[item.listing.id] || ""}
                              onChange={e => setAddressInputs(prev => ({ ...prev, [item.listing.id]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && handleAddressConfirm(item.listing.id, item.listing)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 shrink-0"
                              disabled={feeLoading[item.listing.id]}
                              onClick={() => handleAddressConfirm(item.listing.id, item.listing)}
                            >
                              {feeLoading[item.listing.id] ? <SpinIcon className="w-3 h-3 animate-spin" /> : "Set"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 shrink-0"
                              disabled={feeLoading[item.listing.id]}
                              onClick={() => handleGeolocate(item.listing.id, item.listing)}
                              title="Use my current location"
                            >
                              {feeLoading[item.listing.id] ? <SpinIcon className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              {missingLocation.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-700 text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {missingLocation.length === 1
                    ? "1 delivery item needs a location"
                    : `${missingLocation.length} delivery items need a location`}
                </div>
              )}
              <div className="flex justify-between font-heading font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">KES {getCartTotal()}</span>
              </div>
              <Button
                onClick={handleCheckoutClick}
                disabled={missingLocation.length > 0}
                className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12"
              >
                Proceed to Checkout
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => !isProcessingPayment && setIsPaymentDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Checkout</DialogTitle>
            <DialogDescription>
              Choose your payment method for your total of KES {getCartTotal()}
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
                <span className={`font-bold ${user?.walletBalance && user.walletBalance >= getCartTotal() ? "text-success" : "text-destructive"}`}>
                  KES {(user?.walletBalance || 0).toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">M-Pesa Phone Number</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                {paymentMethod === 'mpesa' ? 'Please check your phone and enter your M-Pesa PIN...' : 'Processing payment...'}
              </div>
            )}
          </div>

          <Button
            onClick={processOrderGroup}
            disabled={isProcessingPayment || (paymentMethod === "wallet" && (user?.walletBalance || 0) < getCartTotal())}
            className={`w-full h-12 font-semibold ${paymentMethod === "mpesa" ? "bg-[#52B44B] hover:bg-[#52B44B]/90 text-white" : ""}`}
          >
            {isProcessingPayment ? "Processing..." : "Confirm Payment"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
