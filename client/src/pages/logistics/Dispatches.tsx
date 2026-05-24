import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PinInput from "@/components/PinInput";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import {
  Truck, MapPin, ArrowRight, User, Phone, RefreshCw,
  CheckCircle2, KeyRound, Search, X, Download,
  PackageCheck, PackageOpen, Clock, ChevronRight,
} from "lucide-react";
import DispatchRouteMap from "@/components/DispatchRouteMap";
import Papa from "papaparse";

const CATEGORY_EMOJI: Record<string, string> = {
  Vegetables: "🥬", Fruits: "🥭", Bakery: "🍞", Dairy: "🥛",
  Grains: "🌾", "Cooked Meals": "🍛", Beverages: "🧃", Other: "📦",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface ListingRef {
  _id: string; title: string; category: string;
  unit: string; price: number; isFree: boolean;
  location: { address: string; lat?: number; lng?: number };
}

interface AvailableTx {
  _id: string;
  listingId: ListingRef | null;
  vendorId:    { name: string; phone: string } | null;
  recipientId: { name: string; phone: string } | null;
  quantity: number;
  deliveryFee: number;
  createdAt: string;
  __tab: "available";
}

interface RiderTx {
  _id: string;
  listingId: ListingRef | null;
  vendorId:    { name: string; phone: string } | null;
  recipientId: { name: string; phone: string } | null;
  quantity: number;
  deliveryFee: number;
  status: "ASSIGNED" | "IN_TRANSIT" | "DELIVERED";
  timeline: { pickedUpAt?: string };
  securityCodes: { pickupPin?: string; deliveryPin?: string };
  deliveryLocation?: { lat?: number; lng?: number; address?: string };
  createdAt: string;
  __tab: "mine";
}

type AnyTx = AvailableTx | RiderTx;

type Tab = "available" | "active" | "completed";

const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "available", label: "Available",  icon: PackageOpen,  color: "text-blue-600" },
  { id: "active",    label: "In Transit", icon: Truck,        color: "text-purple-600" },
  { id: "completed", label: "Completed",  icon: PackageCheck, color: "text-green-600" },
];

type PinMode = { id: string; type: "pickup" | "delivery" };

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Dispatches() {
  const navigate = useNavigate();
  const [tab, setTab]             = useState<Tab>("available");
  const [query, setQuery]         = useState("");
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null);
  const [fetched, setFetched]        = useState<Set<Tab>>(new Set());
  const [accepting, setAccepting] = useState<string | null>(null);
  const [pinMode, setPinMode]     = useState<PinMode | null>(null);
  const [pinInput, setPinInput]   = useState("");
  const [verifying, setVerifying] = useState(false);

  const [available, setAvailable] = useState<AvailableTx[]>([]);
  const [active, setActive]       = useState<RiderTx[]>([]);
  const [completed, setCompleted] = useState<RiderTx[]>([]);

  const loadTab = async (t: Tab, silent = false) => {
    if (!silent) setLoadingTab(t);
    try {
      if (t === "available") {
        const data = await apiClient.get("/transactions/available-dispatches");
        setAvailable((Array.isArray(data) ? data : data?.transactions ?? []).map((tx: any) => ({ ...tx, __tab: "available" as const })));
      } else {
        const data = await apiClient.get("/transactions/rider-dispatches");
        const list: RiderTx[] = (Array.isArray(data) ? data : data?.transactions ?? []).map((tx: any) => ({ ...tx, __tab: "mine" as const }));
        setActive(list.filter((d) => d.status === "ASSIGNED" || d.status === "IN_TRANSIT"));
        setCompleted(list.filter((d) => d.status === "DELIVERED"));
      }
      setFetched((prev) => {
        const next = new Set(prev);
        next.add(t);
        if (t === "active" || t === "completed") { next.add("active"); next.add("completed"); }
        return next;
      });
    } catch {
      toast.error("Failed to load dispatches");
    } finally {
      setLoadingTab(null);
    }
  };

  // Load initial tab on mount
  useEffect(() => { loadTab("available"); }, []);

  // Lazy-load when switching to an unfetched tab
  useEffect(() => {
    if (!fetched.has(tab)) loadTab(tab);
  }, [tab]);

  const isLoading = loadingTab === tab;
  const counts = { available: available.length, active: active.length, completed: completed.length };

  const listForTab: AnyTx[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = tab === "available" ? available : tab === "active" ? active : completed;
    if (!q) return base as AnyTx[];
    return (base as AnyTx[]).filter((d) =>
      d.listingId?.title.toLowerCase().includes(q) ||
      d.vendorId?.name.toLowerCase().includes(q) ||
      d.recipientId?.name.toLowerCase().includes(q) ||
      d.listingId?.location?.address?.toLowerCase().includes(q)
    );
  }, [tab, available, active, completed, query]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAccept = async (txId: string) => {
    setAccepting(txId);
    try {
      await apiClient.put(`/transactions/${txId}/accept`, {});
      toast.success("Dispatch accepted!");
      setAvailable((prev) => prev.filter((d) => d._id !== txId));
      setTimeout(() => { setFetched(new Set()); setTab("active"); }, 800);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept dispatch");
    } finally {
      setAccepting(null);
    }
  };

  const handleVerify = async (tx: RiderTx) => {
    if (!pinMode) return;
    setVerifying(true);
    try {
      await apiClient.put(`/transactions/${tx._id}/verify-delivery`, { pin: pinInput });
      setActive((prev) => prev.filter((d) => d._id !== tx._id));
      setCompleted((prev) => [{ ...tx, status: "DELIVERED" as const }, ...prev]);
      toast.success("Delivery confirmed! Order complete.");
      setPinMode(null);
      setPinInput("");
    } catch (err: any) {
      toast.error(err.message || "Invalid PIN");
    } finally {
      setVerifying(false);
    }
  };

  const exportCSV = () => {
    const rows = completed.map((d) => ({
      ID: d._id,
      Date: fmtDate(d.createdAt),
      Item: d.listingId?.title ?? "—",
      Pickup: d.listingId?.location?.address ?? "—",
      Vendor: d.vendorId?.name ?? "—",
      Recipient: d.recipientId?.name ?? "—",
      "Delivery Fee": `KES ${d.deliveryFee}`,
      Status: d.status,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispatches_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Sub-components ────────────────────────────────────────────────────────

  const AvailableCard = ({ d }: { d: AvailableTx }) => {
    const listing = d.listingId;
    const emoji = listing ? (CATEGORY_EMOJI[listing.category] ?? "📦") : "📦";
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl shrink-0 select-none">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{listing?.title ?? "Listing removed"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {d.quantity} {listing?.unit ?? ""} &middot; {fmtDate(d.createdAt)} {fmtTime(d.createdAt)}
            </p>
          </div>
          <Badge className="bg-blue-500/15 text-blue-700 border-0 text-[11px] font-bold shrink-0">
            🚚 Delivery
          </Badge>
        </div>

        {/* Route strip */}
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <span className="truncate flex-1">{listing?.location?.address ?? "Pickup TBD"}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
          <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
          <span className="italic flex-1 truncate">Recipient location</span>
        </div>

        {/* Details grid */}
        <div className="mx-4 mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Vendor</p>
            <p className="font-medium mt-0.5 flex items-center gap-1 text-xs"><User className="w-3 h-3" />{d.vendorId?.name ?? "—"}</p>
            {d.vendorId?.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{d.vendorId.phone}</p>}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Recipient</p>
            <p className="font-medium mt-0.5 flex items-center gap-1 text-xs"><User className="w-3 h-3" />{d.recipientId?.name ?? "—"}</p>
            {d.recipientId?.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{d.recipientId.phone}</p>}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Delivery Fee</p>
            <p className="font-bold text-primary text-sm mt-0.5">KES {d.deliveryFee}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Item Value</p>
            <p className="font-medium text-sm mt-0.5">{listing?.isFree ? "Free" : `KES ${(listing?.price ?? 0) * d.quantity}`}</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button
            className="w-full h-11 gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold"
            disabled={accepting === d._id}
            onClick={() => handleAccept(d._id)}
          >
            {accepting === d._id
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Accepting…</>
              : <><CheckCircle2 className="w-4 h-4" /> Accept Dispatch</>}
          </Button>
        </div>
      </Card>
    );
  };

  const ActiveCard = ({ tx }: { tx: RiderTx }) => {
    const listing   = tx.listingId;
    const emoji     = listing ? (CATEGORY_EMOJI[listing.category] ?? "📦") : "📦";
    const isAssigned = tx.status === "ASSIGNED";
    const pickedUp  = tx.status === "IN_TRANSIT";
    const isPin     = pinMode?.id === tx._id;

    return (
      <Card className={`overflow-hidden hover:shadow-md transition-shadow ${
        isAssigned ? "border-blue-200 dark:border-blue-900/40" : "border-purple-200 dark:border-purple-900/40"
      }`}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 select-none ${
            isAssigned ? "bg-blue-500/10" : "bg-purple-500/10"
          }`}>
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{listing?.title ?? "Listing removed"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tx.quantity} {listing?.unit ?? ""} &middot; KES {tx.deliveryFee} fee
            </p>
          </div>
          <Badge className={`border-0 text-[11px] font-bold shrink-0 ${
            isAssigned ? "bg-blue-500/15 text-blue-700" : "bg-purple-500/15 text-purple-700"
          }`}>
            {isAssigned ? "🏪 Go to Vendor" : "🚛 In Transit"}
          </Badge>
        </div>

        {/* Route strip */}
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <span className="truncate flex-1">{listing?.location?.address ?? "Pickup"}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
          <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
          <span className="truncate flex-1">{tx.deliveryLocation?.address ?? "Recipient"}</span>
        </div>

        {/* Route map — shown when both coords are available */}
        {listing?.location?.lat && listing?.location?.lng &&
          tx.deliveryLocation?.lat && tx.deliveryLocation?.lng && (
          <div className="mx-4 mb-3">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Truck className="w-3 h-3" /> Route
            </div>
            <DispatchRouteMap
              pickup={{ lat: listing.location.lat!, lng: listing.location.lng!, address: listing.location.address }}
              delivery={{ lat: tx.deliveryLocation.lat!, lng: tx.deliveryLocation.lng!, address: tx.deliveryLocation.address }}
              height="220px"
            />
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground px-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Pickup: {listing.location.address ?? "Vendor"}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Drop: {tx.deliveryLocation.address ?? "Recipient"}</span>
            </div>
          </div>
        )}

        {/* Contacts */}
        <div className="mx-4 mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Vendor</p>
            <p className="font-medium mt-0.5 flex items-center gap-1 text-xs"><User className="w-3 h-3" />{tx.vendorId?.name ?? "—"}</p>
            {tx.vendorId?.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{tx.vendorId.phone}</p>}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Recipient</p>
            <p className="font-medium mt-0.5 flex items-center gap-1 text-xs"><User className="w-3 h-3" />{tx.recipientId?.name ?? "—"}</p>
            {tx.recipientId?.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{tx.recipientId.phone}</p>}
          </div>
        </div>

        {/* Step progress */}
        <div className="mx-4 mb-3 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            isAssigned ? "bg-blue-500/15 text-blue-700" : "bg-green-500/15 text-green-700"
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAssigned ? "Head to Vendor" : "Picked Up ✓"}
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            pickedUp ? "bg-purple-500/15 text-purple-700" : "bg-muted text-muted-foreground"
          }`}>
            <Truck className="w-3.5 h-3.5" /> Deliver
          </div>
        </div>

        {/* PIN display */}
        {isAssigned && tx.securityCodes?.pickupPin && (
          <div className="mx-4 mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/8 border border-blue-400/25">
            <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Your Rider PIN</p>
              <p className="text-[10px] text-muted-foreground">Tell this to the vendor when you arrive to collect</p>
            </div>
            <span className="font-mono font-bold text-xl tracking-widest text-blue-700 shrink-0">{tx.securityCodes.pickupPin}</span>
          </div>
        )}
        {pickedUp && (
          <div className="mx-4 mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/8 border border-green-400/25">
            <KeyRound className="w-4 h-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Ask Recipient for PIN</p>
              <p className="text-[10px] text-muted-foreground">The recipient holds the delivery PIN — ask them to confirm delivery</p>
            </div>
          </div>
        )}

        {/* PIN entry */}
        <div className="px-4 pb-4">
          {isPin ? (
            <div className="space-y-3 bg-muted p-4 rounded-xl">
              <PinInput value={pinInput} onChange={setPinInput} />
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={pinInput.length < 4 || verifying}
                  onClick={() => handleVerify(tx)}
                >
                  {verifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                  Confirm Delivery
                </Button>
                <Button variant="ghost" onClick={() => { setPinMode(null); setPinInput(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {isAssigned && listing?.location?.lat && listing?.location?.lng && (
                <Button
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white h-10"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${listing.location.lat},${listing.location.lng}&travelmode=driving`;
                    window.open(url, "_blank");
                  }}
                >
                  <MapPin className="w-3.5 h-3.5" /> Go to Vendor
                </Button>
              )}
              {isAssigned && (!listing?.location?.lat || !listing?.location?.lng) && (
                <Button
                  className="flex-1 gap-2 h-10"
                  variant="outline"
                  onClick={() => { if (tx.vendorId?.phone) window.open(`tel:${tx.vendorId.phone}`); }}
                >
                  <Phone className="w-3.5 h-3.5" /> Call Vendor
                </Button>
              )}
              {pickedUp && (
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white h-10"
                  onClick={() => { setPinMode({ id: tx._id, type: "delivery" }); setPinInput(""); }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Delivery
                </Button>
              )}
              {pickedUp && tx.deliveryLocation?.lat && tx.deliveryLocation?.lng && (
                <Button
                  className="gap-2 bg-purple-600 hover:bg-purple-700 text-white h-10 px-3"
                  title="Navigate to recipient"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${tx.deliveryLocation!.lat},${tx.deliveryLocation!.lng}&travelmode=driving`;
                    window.open(url, "_blank");
                  }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const CompletedCard = ({ tx }: { tx: RiderTx }) => {
    const listing = tx.listingId;
    const emoji = listing ? (CATEGORY_EMOJI[listing.category] ?? "📦") : "📦";
    return (
      <Card className="overflow-hidden hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-xl shrink-0 select-none">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{listing?.title ?? "Listing removed"}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {listing?.location?.address ?? "—"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {fmtDate(tx.createdAt)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <Badge className="bg-green-500/15 text-green-700 border-0 text-[11px] font-bold mb-1">✅ Delivered</Badge>
            <p className="text-xs font-bold text-primary">+KES {tx.deliveryFee}</p>
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{tx.vendorId?.name ?? "—"} → {tx.recipientId?.name ?? "—"}</span>
          <span className="font-medium">{tx.quantity} {listing?.unit ?? "units"}</span>
        </div>
      </Card>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl">Dispatches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all your delivery orders in one place</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {tab === "completed" && completed.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setFetched(new Set()); loadTab(tab); }} className="gap-1.5" disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        {TAB_CONFIG.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`w-4 h-4 ${tab === id ? color : ""}`} />
            <span className="hidden sm:inline">{label}</span>
            {counts[id] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === id ? `${color} bg-primary/10` : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Search by item, vendor, recipient, address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : listForTab.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Truck className="w-14 h-14 text-muted-foreground/30" />
          <p className="font-semibold text-muted-foreground">
            {query ? "No dispatches match your search" : tab === "available"
              ? "No dispatches available right now"
              : tab === "active"
              ? "No active dispatches — accept one from Available"
              : "No completed deliveries yet"}
          </p>
          {tab === "active" && !query && (
            <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => setTab("available")}>
              <ChevronRight className="w-3.5 h-3.5" /> Browse Available
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {listForTab.map((d) =>
            tab === "available" ? (
              <AvailableCard key={d._id} d={d as AvailableTx} />
            ) : tab === "active" ? (
              <ActiveCard key={d._id} tx={d as RiderTx} />
            ) : (
              <CompletedCard key={d._id} tx={d as RiderTx} />
            )
          )}
        </div>
      )}
    </div>
  );
}
