import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Package, MapPin, Truck, ShoppingBag,
  CheckCircle2, RefreshCw, XCircle, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

interface Transaction {
  _id: string;
  listingId: { _id: string; title: string; category: string; unit: string; price: number; isFree: boolean } | null;
  vendorId: { name: string } | null;
  quantity: number;
  fulfillmentMode: "Pickup" | "Delivery";
  deliveryFee: number;
  status: "CLAIMED" | "AWAITING_RIDER" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  timeline: { claimedAt?: string };
  securityCodes: { pickupPin: string; deliveryPin: string };
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  CLAIMED:        { label: "Claimed",         icon: ShoppingBag,  cls: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  AWAITING_RIDER: { label: "Awaiting Rider",  icon: Truck,        cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  IN_TRANSIT:     { label: "In Transit",      icon: Truck,        cls: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  DELIVERED:      { label: "Delivered",       icon: CheckCircle2, cls: "bg-green-500/15 text-green-700 dark:text-green-400" },
  CANCELLED:      { label: "Cancelled",       icon: XCircle,      cls: "bg-red-500/15 text-red-700 dark:text-red-400" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  Vegetables: "🥬", Fruits: "🥭", Bakery: "🍞", Dairy: "🥛",
  Grains: "🌾", "Cooked Meals": "🍛", Beverages: "🧃", Other: "📦",
};

const ACTIVE_STATUSES = ["CLAIMED", "AWAITING_RIDER", "IN_TRANSIT"];

export default function MyOrders() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get("/transactions");
      // Backend returns { success, transactions }
      const list = Array.isArray(data) ? data : (data?.transactions ?? []);
      setTransactions(list);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this order?")) return;
    setCancelling(id);
    try {
      await apiClient.put(`/transactions/${id}/cancel`, {});
      toast.success("Order cancelled");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const active = transactions.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const past = transactions.filter((t) => !ACTIVE_STATUSES.includes(t.status));

  const OrderCard = ({ tx }: { tx: Transaction }) => {
    const cfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.CLAIMED;
    const StatusIcon = cfg.icon;
    const listing = tx.listingId;
    const emoji = listing ? (CATEGORY_EMOJI[listing.category] ?? "📦") : "📦";
    const title = listing?.title ?? "Listing removed";
    const total = listing
      ? (listing.isFree ? 0 : listing.price * tx.quantity) + (tx.fulfillmentMode === "Delivery" ? tx.deliveryFee : 0)
      : 0;
    const date = new Date(tx.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
    const canCancel = tx.status === "CLAIMED";

    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 select-none">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              #{tx._id.slice(-8).toUpperCase()} · {date}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.cls}`}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>

        {/* Body */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="font-medium mt-0.5">{tx.quantity} {listing?.unit ?? ""}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fulfillment</p>
            <p className="font-medium mt-0.5 flex items-center gap-1">
              {tx.fulfillmentMode === "Delivery"
                ? <><Truck className="w-3 h-3" /> Delivery</>
                : <><MapPin className="w-3 h-3" /> Pickup</>}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vendor</p>
            <p className="font-medium mt-0.5 truncate">{tx.vendorId?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold mt-0.5 text-primary">
              {listing?.isFree ? "Free" : `KES ${total}`}
            </p>
          </div>
        </div>

        {/* Delivery PIN — shown to buyer once rider is heading their way */}
        {tx.status === "IN_TRANSIT" && tx.securityCodes?.deliveryPin && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-400/30">
              <KeyRound className="w-4 h-4 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Give this PIN to the rider on arrival</p>
                <p className="font-mono font-bold text-2xl tracking-[0.3em] text-green-700 dark:text-green-300 mt-0.5">{tx.securityCodes.deliveryPin}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {canCancel && (
          <div className="px-4 pb-4">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              disabled={cancelling === tx._id}
              onClick={() => handleCancel(tx._id)}
            >
              {cancelling === tx._id ? (
                <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Cancelling…</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1.5" /> Cancel Order</>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your food claims and purchases</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Active orders */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active ({active.length})
          </h2>
          {active.map((tx) => <OrderCard key={tx._id} tx={tx} />)}
        </div>
      )}

      {/* Past orders */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Past ({past.length})
          </h2>
          {past.map((tx) => <OrderCard key={tx._id} tx={tx} />)}
        </div>
      )}

      {/* Empty state */}
      {transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Package className="w-12 h-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-muted-foreground">No orders yet</p>
            <p className="text-sm text-muted-foreground mt-0.5">Browse listings and claim surplus food to get started</p>
          </div>
          <Button onClick={() => navigate("/dashboard/listings")} className="mt-1">
            Browse Listings
          </Button>
        </div>
      )}
    </div>
  );
}
