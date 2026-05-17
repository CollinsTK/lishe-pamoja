import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import PinInput from "@/components/PinInput";
import {
  RefreshCw, MapPin, Truck, User, Package, Send,
  XCircle, Clock, CheckCircle2, Bike, KeyRound,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  CLAIMED:       "Claimed",
  AWAITING_RIDER:"Awaiting Rider",
  ASSIGNED:      "Rider Assigned",
  IN_TRANSIT:    "In Transit",
  DELIVERED:     "Delivered",
  CANCELLED:     "Cancelled",
};

const STATUS_CLS: Record<string, string> = {
  CLAIMED:        "bg-yellow-500/15 text-yellow-700",
  AWAITING_RIDER: "bg-blue-500/15 text-blue-700",
  ASSIGNED:       "bg-orange-500/15 text-orange-700",
  IN_TRANSIT:     "bg-purple-500/15 text-purple-700",
  DELIVERED:      "bg-green-500/15 text-green-700",
  CANCELLED:      "bg-red-500/15 text-red-700",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  CLAIMED:        Clock,
  AWAITING_RIDER: Bike,
  ASSIGNED:       Bike,
  IN_TRANSIT:     Truck,
  DELIVERED:      CheckCircle2,
  CANCELLED:      XCircle,
};

interface SalesTx {
  _id: string;
  listingId: { title: string; unit: string; price: number; isFree: boolean } | null;
  recipientId: { name: string; email: string } | null;
  quantity: number;
  fulfillmentMode: "Pickup" | "Delivery";
  deliveryFee: number;
  status: string;
  securityCodes: { pickupPin: string; deliveryPin: string };
  createdAt: string;
}

type PinMode = { id: string };

export default function VendorOrders() {
  const [orders, setOrders] = useState<SalesTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<PinMode | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get("/transactions/vendor");
      const list = Array.isArray(data) ? data : (data?.transactions ?? []);
      setOrders(list);
    } catch (err) {
      toast.error("Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkReady = async (txId: string) => {
    setBusy(txId);
    try {
      await apiClient.put(`/transactions/${txId}/ready-for-dispatch`, {});
      setOrders((prev) => prev.map((o) => o._id === txId ? { ...o, status: "AWAITING_RIDER" } : o));
      toast.success("Order is now awaiting a rider");
    } catch (err: any) {
      toast.error(err.message || "Failed to mark ready for dispatch");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (txId: string) => {
    if (!confirm("Cancel this order?")) return;
    setBusy(txId);
    try {
      await apiClient.put(`/transactions/${txId}/cancel`, {});
      setOrders((prev) => prev.map((o) => o._id === txId ? { ...o, status: "CANCELLED" } : o));
      toast.success("Order cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setBusy(null);
    }
  };

  const handleVerifyPickup = async (txId: string) => {
    setVerifying(true);
    try {
      await apiClient.put(`/transactions/${txId}/verify-pickup`, { pin: pinInput });
      setOrders((prev) => prev.map((o) => o._id === txId ? { ...o, status: "IN_TRANSIT" } : o));
      toast.success("Rider collected — order is now in transit!");
      setPinMode(null);
      setPinInput("");
    } catch (err: any) {
      toast.error(err.message || "Invalid PIN");
    } finally {
      setVerifying(false);
    }
  };

  const active    = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));
  const past      = orders.filter((o) => ["DELIVERED", "CANCELLED"].includes(o.status));
  const revenue   = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + (o.listingId?.isFree ? 0 : (o.listingId?.price ?? 0)) * o.quantity + (o.deliveryFee ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const OrderCard = ({ o }: { o: SalesTx }) => {
    const listing = o.listingId;
    const total = (listing?.isFree ? 0 : (listing?.price ?? 0) * o.quantity) + (o.deliveryFee ?? 0);
    const StatusIcon = STATUS_ICON[o.status] ?? Package;
    const canMarkReady  = o.status === "CLAIMED";
    const canCancel     = ["CLAIMED", "AWAITING_RIDER"].includes(o.status);
    const needsPickupPin = o.status === "ASSIGNED";
    const isPinOpen      = pinMode?.id === o._id;

    return (
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {o.quantity} {listing?.unit ?? ""} · {listing?.title ?? "Listing removed"}
            </h3>
            <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {o.recipientId?.name ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                {o.fulfillmentMode === "Delivery"
                  ? <><Truck className="w-3 h-3" /> Delivery</>
                  : <><MapPin className="w-3 h-3" /> Pickup</>}
              </span>
            </div>
          </div>
          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CLS[o.status] ?? "bg-muted text-muted-foreground"}`}>
            <StatusIcon className="w-3 h-3" />
            {STATUS_LABEL[o.status] ?? o.status}
          </span>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground bg-muted/30">
          <span>{new Date(o.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
          <span className="font-bold text-foreground">{listing?.isFree ? "Free" : `KES ${total}`}</span>
        </div>

        {/* Rider assigned — vendor confirms collection by entering rider's PIN */}
        {needsPickupPin && (
          <div className="mx-4 mb-3 space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-400/30">
              <Bike className="w-4 h-4 text-orange-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-orange-700">Rider is on the way</p>
                <p className="text-[11px] text-muted-foreground">When the rider arrives, ask for their PIN and enter it below to confirm collection</p>
              </div>
            </div>
            {isPinOpen ? (
              <div className="space-y-3 bg-muted p-4 rounded-xl">
                <PinInput value={pinInput} onChange={setPinInput} />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={pinInput.length < 4 || verifying}
                    onClick={() => handleVerifyPickup(o._id)}
                  >
                    {verifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                    Confirm Collection
                  </Button>
                  <Button variant="ghost" onClick={() => { setPinMode(null); setPinInput(""); }}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-white h-10"
                onClick={() => { setPinMode({ id: o._id }); setPinInput(""); }}
              >
                <KeyRound className="w-3.5 h-3.5" /> Enter Rider PIN to Confirm Collection
              </Button>
            )}
          </div>
        )}

        {/* Actions — only shown when relevant */}
        {(canMarkReady || canCancel) && (
          <div className="flex gap-2 px-4 pb-4 pt-1">
            {canMarkReady && (
              <Button
                size="sm"
                disabled={busy === o._id}
                onClick={() => handleMarkReady(o._id)}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                {busy === o._id
                  ? <><RefreshCw className="w-3 h-3 animate-spin" /> Working…</>
                  : <><Send className="w-3 h-3" /> Mark Ready for Dispatch</>}
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy === o._id}
                onClick={() => handleCancel(o._id)}
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                {busy === o._id
                  ? <><RefreshCw className="w-3 h-3 animate-spin" /> Cancelling…</>
                  : <><XCircle className="w-3 h-3" /> Cancel</>}
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Sales Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage orders from your buyers</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New",        value: orders.filter((o) => o.status === "CLAIMED").length,        cls: "text-yellow-600" },
          { label: "Dispatching",value: orders.filter((o) => ["AWAITING_RIDER","IN_TRANSIT"].includes(o.status)).length, cls: "text-blue-600" },
          { label: "Delivered",  value: orders.filter((o) => o.status === "DELIVERED").length,      cls: "text-green-600" },
          { label: "Revenue",    value: `KES ${revenue.toLocaleString()}`,                          cls: "text-primary" },
        ].map(({ label, value, cls }) => (
          <Card key={label} className="p-3 text-center">
            <p className={`font-heading font-bold text-xl ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {/* Active orders */}
      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active ({active.length})</p>
          {active.map((o) => <OrderCard key={o._id} o={o} />)}
        </div>
      )}

      {/* Past orders */}
      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past ({past.length})</p>
          {past.map((o) => <OrderCard key={o._id} o={o} />)}
        </div>
      )}

      {orders.length === 0 && (
        <Card className="p-10 text-center">
          <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No sales orders yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Orders will appear here once buyers claim your listings.</p>
        </Card>
      )}
    </div>
  );
}
