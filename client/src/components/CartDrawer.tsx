import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Smartphone, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

export function CartDrawer() {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const { user, updateAuthUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "mpesa">("wallet");
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || "");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
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
          deliveryFee: item.deliveryFee
        })),
        phoneNumber: paymentMethod === 'mpesa' ? mpesaPhone : undefined
      };

      await apiClient.post('/transactions/checkout', payload);

      if (paymentMethod === "wallet") {
        const total = getCartTotal();
        const currentBalance = user?.walletBalance || 0;
        if (currentBalance < total) {
          toast.error("Insufficient wallet balance.");
          setIsProcessingPayment(false);
          return;
        }
        updateAuthUser({ walletBalance: currentBalance - total });
      }

      toast.success("Checkout Successful!", {
        description: `Your order for ${itemCount} items has been placed.`,
      });
      clearCart();
      setIsPaymentDialogOpen(false);
      // Optional: trigger a data reload here, perhaps by window.location.reload() or refreshing context
      setTimeout(() => window.location.href = '/orders', 1500);
    } catch (error: any) {
      toast.error(error.message || "Checkout failed. Please try again.");
    } finally {
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
                <div key={item.listing.id} className="flex gap-3 bg-muted/50 p-3 rounded-xl">
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
                        {item.fulfillmentMode} {item.fulfillmentMode === "Delivery" && `(+KES ${item.deliveryFee})`}
                      </p>
                      <p className="font-semibold text-primary mt-1">
                        KES {(item.listing.price * item.quantity) + item.deliveryFee}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between font-heading font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">KES {getCartTotal()}</span>
              </div>
              <Button onClick={handleCheckoutClick} className="w-full bg-gradient-hero text-primary-foreground font-semibold h-12">
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
