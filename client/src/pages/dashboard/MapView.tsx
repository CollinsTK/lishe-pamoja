import { useData } from "@/contexts/DataContext";
import { DeliveryRoute } from "@/components/AllListingsMap";
import { useAuth } from "@/contexts/AuthContext";
import AllListingsMap from "@/components/AllListingsMap";
import { MapPin, Truck, Search, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORY_EMOJI: Record<string, string> = {
  Vegetables: "🥬", Fruits: "🥭", Bakery: "🍞", Dairy: "🥛",
  Grains: "🌾", "Cooked Meals": "🍛", Beverages: "🧃", Other: "📦",
};

const CATEGORIES = ["All", "Vegetables", "Fruits", "Bakery", "Dairy", "Grains", "Cooked Meals", "Beverages", "Other"];
const STATUSES = [
  { value: "all",              label: "All statuses" },
  { value: "available",        label: "Available" },
  { value: "partially_claimed",label: "Partly Claimed" },
  { value: "fully_claimed",    label: "Fully Claimed" },
];

export default function MapView() {
  const { listings, isLoading, startListingsPolling, stopListingsPolling } = useData();
  const { capabilities, user } = useAuth();
  const userLat = user?.location?.lat ?? null;
  const userLng = user?.location?.lng ?? null;
  const hasUserLocation = userLat !== null && userLng !== null;
  const navigate = useNavigate();
  const [dispatchIds, setDispatchIds] = useState<Set<string>>(new Set());
  const [availableDispatches, setAvailableDispatches] = useState<any[]>([]);
  const [riderDispatches, setRiderDispatches] = useState<any[]>([]);

  // Search panel state
  const [panelOpen, setPanelOpen] = useState(true);
  const [query, setQuery]         = useState("");
  const [category, setCategory]   = useState("All");
  const [status, setStatus]       = useState("all");

  useEffect(() => {
    startListingsPolling();
    return () => stopListingsPolling();
  }, [startListingsPolling, stopListingsPolling]);

  useEffect(() => {
    if (!capabilities.canDeliver) return;
    // Available dispatches (unclaimed)
    apiClient.get("/transactions/available-dispatches")
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.transactions ?? []);
        const ids = new Set<string>(list.map((t: any) => t.listingId?._id ?? t.listingId).filter(Boolean));
        setDispatchIds(ids);
        setAvailableDispatches(list);
      })
      .catch(() => {});
    // Rider's own active dispatches (ASSIGNED / IN_TRANSIT)
    apiClient.get("/transactions/rider-dispatches")
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.transactions ?? []);
        setRiderDispatches(list.filter((d: any) => d.status === "ASSIGNED" || d.status === "IN_TRANSIT"));
      })
      .catch(() => {});
  }, [capabilities.canDeliver]);

  const now = Date.now();
  const allValid = useMemo(
    () => listings.filter((l) =>
      l.location?.lat && l.location?.lng &&
      l.status !== 'expired' && l.status !== 'cancelled' && l.status !== 'fully_claimed' &&
      (!l.expiryDateTime || new Date(l.expiryDateTime).getTime() > now)
    ),
    [listings],
  );

  // Sort by distance from user when location is set, otherwise keep stable insertion order
  const shuffled = useMemo(() => {
    const copy = [...allValid];
    if (hasUserLocation) {
      copy.sort((a, b) =>
        haversineKm(userLat!, userLng!, a.location.lat, a.location.lng) -
        haversineKm(userLat!, userLng!, b.location.lat, b.location.lng)
      );
    }
    return copy;
  }, [allValid, hasUserLocation, userLat, userLng]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return shuffled.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q) && !l.location.address?.toLowerCase().includes(q)) return false;
      if (category !== "All" && l.category !== category) return false;
      if (status !== "all" && l.status !== status) return false;
      return true;
    });
  }, [shuffled, query, category, status]);

  const hasFilters = !!(query || category !== "All" || status !== "all");
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [focusedDispatch, setFocusedDispatch] = useState<DeliveryRoute | null>(null);

  // Build delivery routes from rider's own active dispatches (enriched with contacts)
  const deliveryRoutes = useMemo<DeliveryRoute[]>(() => {
    if (!capabilities.canDeliver) return [];
    return riderDispatches.map((d: any) => {
      const listing = d.listingId;
      return {
        id: d._id,
        title: listing?.title || `Dispatch #${d._id?.slice(-6)}`,
        status: d.status,
        vendorName: d.vendorId?.name,
        vendorPhone: d.vendorId?.phone,
        recipientName: d.recipientId?.name,
        recipientPhone: d.recipientId?.phone,
        deliveryFee: d.deliveryFee,
        pickup: listing?.location?.lat && listing?.location?.lng
          ? [listing.location.lat, listing.location.lng] as [number, number]
          : null,
        pickupAddress: listing?.location?.address || 'Pickup location',
        delivery: d.deliveryLocation?.lat && d.deliveryLocation?.lng
          ? [d.deliveryLocation.lat, d.deliveryLocation.lng] as [number, number]
          : null,
        deliveryAddress: d.deliveryLocation?.address || d.dropoffAddress || 'Delivery location',
      };
    });
  }, [riderDispatches, capabilities.canDeliver]);

  // Helper: build a DeliveryRoute from an available dispatch for focus
  const buildAvailableRoute = (d: any): DeliveryRoute => {
    const listing = d.listingId;
    return {
      id: d._id,
      title: listing?.title || `Dispatch #${d._id?.slice(-6)}`,
      status: "AWAITING_RIDER",
      vendorName: d.vendorId?.name,
      vendorPhone: d.vendorId?.phone,
      recipientName: d.recipientId?.name,
      recipientPhone: d.recipientId?.phone,
      deliveryFee: d.deliveryFee,
      pickup: listing?.location?.lat && listing?.location?.lng
        ? [listing.location.lat, listing.location.lng] as [number, number]
        : null,
      pickupAddress: listing?.location?.address || 'Pickup location',
      delivery: d.deliveryLocation?.lat && d.deliveryLocation?.lng
        ? [d.deliveryLocation.lat, d.deliveryLocation.lng] as [number, number]
        : null,
      deliveryAddress: d.deliveryLocation?.address || d.dropoffAddress || 'Delivery location',
    };
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar ── */}
      {panelOpen && (
        <div className="w-72 shrink-0 flex flex-col bg-background border-r border-border z-10 shadow-xl overflow-hidden">

          {/* Search bar */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search listings or addresses…"
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
          </div>

          {/* Horizontal filter bar — scrolls left/right, no scrollbar */}
          <div className="border-b border-border">
            <div
              className="flex gap-1.5 px-3 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {/* Status chips first */}
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors shrink-0 ${
                    status === s.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s.value !== "all" && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      s.value === "available" ? "bg-green-500" :
                      s.value === "partially_claimed" ? "bg-yellow-500" : "bg-red-400"
                    }`} />
                  )}
                  {s.label}
                </button>
              ))}
              {/* Divider */}
              <div className="w-px bg-border shrink-0 mx-0.5" />
              {/* Category chips */}
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors shrink-0 ${
                    category === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable results content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">

            {/* Result count + clear */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{filtered.length}</span> listing{filtered.length !== 1 ? "s" : ""} shown
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setQuery(""); setCategory("All"); setStatus("all"); }}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 shrink-0" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Claimed</span>
              {capabilities.canDeliver && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" /> Dispatch</span>}
              {capabilities.canDeliver && deliveryRoutes.length > 0 && (
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-red-500 shrink-0" style={{ borderTop: '3px solid #E8371B', height: 0 }} /> Route</span>
              )}
            </div>

            {/* ── Logistics: rider active dispatches ── */}
            {capabilities.canDeliver && riderDispatches.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Active Routes</p>
                <div className="space-y-2">
                  {riderDispatches.map((d: any) => {
                    const listing = d.listingId;
                    const isAssigned = d.status === "ASSIGNED";
                    return (
                      <div key={d._id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border bg-background ${
                        isAssigned ? "border-blue-400/30" : "border-purple-400/30"
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isAssigned ? "bg-blue-500/10" : "bg-purple-500/10"
                        }`}>
                          <Truck className={`w-4 h-4 ${isAssigned ? "text-blue-600" : "text-purple-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{listing?.title ?? "Dispatch"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{listing?.location?.address ?? ""}</p>
                          <span className={`text-[10px] font-semibold ${
                            isAssigned ? "text-blue-600" : "text-purple-600"
                          }`}>{isAssigned ? "🏪 Head to vendor" : "🚛 In transit"}</span>
                        </div>
                        <button
                          onClick={() => {
                            const route = deliveryRoutes.find(r => r.id === d._id);
                            if (route) { setFocusedDispatch(route); setFocusLocation(null); }
                          }}
                          className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                        >
                          <MapPin className="w-2.5 h-2.5" /> Focus
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Logistics: available dispatches to claim ── */}
            {capabilities.canDeliver && availableDispatches.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available to Claim</p>
                <div className="space-y-2">
                  {availableDispatches.map((d: any) => {
                    const listing = d.listingId;
                    return (
                      <div key={d._id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-orange-400/30 bg-orange-500/5">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{listing?.title ?? "Dispatch"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{listing?.location?.address ?? ""}</p>
                          <p className="text-[10px] font-semibold text-orange-600">KES {d.deliveryFee} fee</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => { setFocusedDispatch(buildAvailableRoute(d)); setFocusLocation(null); }}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <MapPin className="w-2.5 h-2.5" /> Focus
                          </button>
                          <button
                            onClick={() => navigate("/dashboard/deliver/dispatches")}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 hover:bg-orange-500/25 transition-colors"
                          >
                            <ChevronRight className="w-2.5 h-2.5" /> Accept
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Listings — always shown, randomised, filtered in real time */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {hasFilters ? "Results" : hasUserLocation ? "Near You" : "Nearby"}
              </p>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No listings match</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((l) => {
                    const isAvailable = l.status === "available";
                    const hasDispatch = capabilities.canDeliver && dispatchIds.has(l.id);
                    const distKm = hasUserLocation
                      ? haversineKm(userLat!, userLng!, l.location.lat, l.location.lng)
                      : null;
                    const distLabel = distKm !== null
                      ? distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`
                      : null;
                    return (
                      <div
                        key={l.id}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border bg-background text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0 select-none">
                          {CATEGORY_EMOJI[l.category] ?? "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold truncate">{l.title}</p>
                            {distLabel && (
                              <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />{distLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{l.location?.address ?? ""}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isAvailable ? "bg-green-500/15 text-green-700" :
                              l.status === "partially_claimed" ? "bg-yellow-500/15 text-yellow-700" :
                              "bg-red-500/15 text-red-600"
                            }`}>
                              {isAvailable ? "Available" : l.status === "partially_claimed" ? "Partly claimed" : "Fully claimed"}
                            </span>
                            {hasDispatch && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-700">🚚 Dispatch</span>
                            )}
                          </div>
                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              onClick={() => setFocusLocation({ lat: l.location.lat, lng: l.location.lng })}
                              className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <MapPin className="w-2.5 h-2.5" /> Focus
                            </button>
                            <button
                              onClick={() => navigate(`/dashboard/listings/${l.id}`)}
                              className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted hover:bg-accent text-muted-foreground transition-colors"
                            >
                              <ChevronRight className="w-2.5 h-2.5" /> View
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Map area ── */}
      <div className="relative flex-1 min-w-0">
        {/* Toggle sidebar button — overlaid on map top-left */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={`absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg border text-sm font-semibold transition-colors ${
            panelOpen || hasFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background/95 backdrop-blur-sm border-border text-foreground"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {!panelOpen && <span className="text-xs">Filters{hasFilters ? " •" : ""}</span>}
        </button>

        {allValid.length > 0 ? (
          <AllListingsMap
            listings={filtered}
            height="100%"
            showViewLink={true}
            isLogistics={capabilities.canDeliver}
            availableDispatchIds={dispatchIds}
            focusLocation={focusedDispatch ? undefined : (focusLocation ?? undefined)}
            deliveryRoutes={deliveryRoutes}
            focusedDispatch={focusedDispatch}
            onClearFocusedDispatch={() => setFocusedDispatch(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/30">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isLoading ? "Loading map data..." : "No listings with location data available"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
