import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Listing } from "@/types";

// ── OSRM road-following route ─────────────────────────────────────────────
async function fetchOsrmCoords(
  from: [number, number],
  to: [number, number],
): Promise<[number, number][] | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}` +
      `?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    return data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );
  } catch {
    return null;
  }
}

function RoadRoute({ pickup, delivery }: { pickup: [number, number]; delivery: [number, number] }) {
  const [coords, setCoords] = useState<[number, number][]>([pickup, delivery]);
  useEffect(() => {
    let cancelled = false;
    fetchOsrmCoords(pickup, delivery).then((c) => {
      if (!cancelled && c && c.length >= 2) setCoords(c);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup[0], pickup[1], delivery[0], delivery[1]]);

  return (
    <>
      {/* White outline for contrast */}
      <Polyline
        positions={coords}
        pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.4, lineJoin: "round", lineCap: "round" }}
      />
      {/* Red road line */}
      <Polyline
        positions={coords}
        pathOptions={{ color: "#E8371B", weight: 6, opacity: 0.92, lineJoin: "round", lineCap: "round" }}
      />
    </>
  );
}

function FlyToMarker({ location }: { location?: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    map.flyTo([location.lat, location.lng], 16, { duration: 1.2 });
    const timer = setTimeout(() => {
      map.eachLayer((layer: any) => {
        if (layer.getLatLng) {
          const ll = layer.getLatLng();
          const dist = Math.abs(ll.lat - location.lat) + Math.abs(ll.lng - location.lng);
          if (dist < 0.0001 && layer.openPopup) layer.openPopup();
        }
      });
    }, 1350);
    return () => clearTimeout(timer);
  }, [location, map]);
  return null;
}

function FitDispatchBounds({ route }: { route?: DeliveryRoute | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route) return;
    const points: [number, number][] = [];
    if (route.pickup) points.push(route.pickup);
    if (route.delivery) points.push(route.delivery);
    if (points.length === 2) {
      map.flyToBounds(L.latLngBounds(points), { padding: [60, 60], duration: 1.2 });
    } else if (points.length === 1) {
      map.flyTo(points[0], 16, { duration: 1.2 });
    }
  }, [route, map]);
  return null;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export { redIcon, greenIcon, orangeIcon };

const CATEGORY_EMOJI: Record<string, string> = {
  Vegetables: "🥬", Fruits: "🥭", Bakery: "🍞", Dairy: "🥛",
  Grains: "🌾", "Cooked Meals": "🍛", Beverages: "🧃", Other: "📦",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available:        { label: "Available",       color: "#15803d", bg: "#dcfce7" },
  partially_claimed:{ label: "Partly Claimed",  color: "#b45309", bg: "#fef3c7" },
  fully_claimed:    { label: "Fully Claimed",   color: "#6b7280", bg: "#f3f4f6" },
  expired:          { label: "Expired",         color: "#dc2626", bg: "#fee2e2" },
  cancelled:        { label: "Cancelled",       color: "#6b7280", bg: "#f3f4f6" },
};

function fmt(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-KE", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function fmtTime(timeStr?: string) {
  if (!timeStr) return "—";
  return timeStr.length === 5 ? timeStr : new Date(timeStr).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export interface DeliveryRoute {
  id: string;
  title: string;
  status: string;
  vendorName?: string;
  vendorPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryFee?: number;
  pickup: [number, number] | null;
  pickupAddress: string;
  delivery: [number, number] | null;
  deliveryAddress: string;
}

interface AllListingsMapProps {
  listings: Listing[];
  height?: string;
  showViewLink?: boolean;
  availableDispatchIds?: Set<string>;
  isLogistics?: boolean;
  focusLocation?: { lat: number; lng: number };
  deliveryRoutes?: DeliveryRoute[];
  focusedDispatch?: DeliveryRoute | null;
  onClearFocusedDispatch?: () => void;
}

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];

export default function AllListingsMap({ listings, height = "400px", showViewLink = true, availableDispatchIds, isLogistics = false, focusLocation, deliveryRoutes = [], focusedDispatch, onClearFocusedDispatch }: AllListingsMapProps) {
  const navigate = useNavigate();

  const now = Date.now();
  const validListings = listings.filter((l) =>
    l.location?.lat && l.location?.lng &&
    l.status !== 'expired' && l.status !== 'cancelled' && l.status !== 'fully_claimed' &&
    (!l.expiryDateTime || new Date(l.expiryDateTime).getTime() > now)
  );

  const center: [number, number] =
    validListings.length > 0
      ? [validListings[0].location.lat, validListings[0].location.lng]
      : DEFAULT_CENTER;

  const statusLabel = focusedDispatch?.status === "ASSIGNED" ? "Go to Vendor" : focusedDispatch?.status === "IN_TRANSIT" ? "In Transit" : focusedDispatch?.status ?? "";
  const statusColor = focusedDispatch?.status === "ASSIGNED" ? "#2563eb" : "#7c3aed";

  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      {/* ── Dispatch detail navbar overlay ── */}
      {focusedDispatch && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 1100, width: "min(420px, calc(100% - 32px))",
          background: "white", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          border: "1px solid #e5e7eb", overflow: "hidden",
        }}>
          {/* Top colour strip */}
          <div style={{ background: statusColor, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🚚</span>
              <div>
                <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{focusedDispatch.title}</p>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{statusLabel}</span>
              </div>
            </div>
            {onClearFocusedDispatch && (
              <button onClick={onClearFocusedDispatch} style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 8, padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✕</span>
              </button>
            )}
          </div>
          {/* Route row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#f9fafb", borderBottom: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 12 }}>📦</span>
            <span style={{ fontSize: 11, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{focusedDispatch.pickupAddress}</span>
            <span style={{ color: "#9ca3af", fontSize: 11 }}>→</span>
            <span style={{ fontSize: 12 }}>🏠</span>
            <span style={{ fontSize: 11, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{focusedDispatch.deliveryAddress}</span>
          </div>
          {/* Contacts row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, padding: "8px 14px" }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Vendor</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "#111827" }}>{focusedDispatch.vendorName ?? "—"}</p>
              {focusedDispatch.vendorPhone && <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>📞 {focusedDispatch.vendorPhone}</p>}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Recipient</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "#111827" }}>{focusedDispatch.recipientName ?? "—"}</p>
              {focusedDispatch.recipientPhone && <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>📞 {focusedDispatch.recipientPhone}</p>}
            </div>
            {focusedDispatch.deliveryFee !== undefined && (
              <div style={{ marginTop: 4 }}>
                <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Delivery Fee</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: statusColor }}>KES {focusedDispatch.deliveryFee}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        <FlyToMarker location={focusedDispatch ? undefined : focusLocation} />
        <FitDispatchBounds route={focusedDispatch} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ── Focused dispatch route (any status, including unclaimed) ── */}
        {focusedDispatch?.pickup && focusedDispatch?.delivery && (
          <>
            <RoadRoute pickup={focusedDispatch.pickup} delivery={focusedDispatch.delivery} />
            <Marker position={focusedDispatch.pickup} icon={orangeIcon}>
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>📦 Pickup</p>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{focusedDispatch.title}</p>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{focusedDispatch.pickupAddress}</p>
                </div>
              </Popup>
            </Marker>
            <Marker position={focusedDispatch.delivery} icon={greenIcon}>
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>🏠 Drop-off</p>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{focusedDispatch.title}</p>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{focusedDispatch.deliveryAddress}</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {validListings.map((listing) => {
          const status = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.available;
          const emoji = CATEGORY_EMOJI[listing.category] ?? "📦";
          const hasDispatch = isLogistics && availableDispatchIds?.has(listing.id);

          return (
            <Marker
              key={listing.id}
              position={[listing.location.lat, listing.location.lng]}
              icon={hasDispatch ? orangeIcon : listing.status === "available" ? greenIcon : redIcon}
            >
              <Popup minWidth={240} maxWidth={280}>
                {/* Header */}
                <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "28px", lineHeight: 1 }}>{emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", lineHeight: "1.3", margin: 0, color: "#111827" }}>
                        {listing.title}
                      </p>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0" }}>
                        {listing.vendorName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status + Price row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 600, padding: "2px 8px",
                    borderRadius: "999px", color: status.color, backgroundColor: status.bg,
                  }}>
                    {status.label}
                  </span>
                  <span style={{
                    fontSize: "13px", fontWeight: 700,
                    color: listing.isFree ? "#15803d" : "#111827",
                  }}>
                    {listing.isFree ? "FREE" : `KES ${listing.price}`}
                  </span>
                </div>

                {/* Details grid */}
                <div style={{ fontSize: "11px", color: "#374151", display: "grid", gap: "4px" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#9ca3af", minWidth: "56px" }}>Category</span>
                    <span style={{ fontWeight: 500 }}>{listing.category}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#9ca3af", minWidth: "56px" }}>Quantity</span>
                    <span style={{ fontWeight: 500 }}>{listing.quantity} {listing.unit}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#9ca3af", minWidth: "56px" }}>Pickup</span>
                    <span style={{ fontWeight: 500 }}>{fmtTime(listing.pickupStart)} – {fmtTime(listing.pickupEnd)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#9ca3af", minWidth: "56px" }}>Expires</span>
                    <span style={{ fontWeight: 500 }}>{fmt(listing.expiryDateTime)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "#9ca3af", minWidth: "56px" }}>📍</span>
                    <span style={{ fontWeight: 500, fontSize: "10px", color: "#6b7280" }}>{listing.location.address}</span>
                  </div>
                </div>

                {/* Description */}
                {listing.description && (
                  <p style={{
                    fontSize: "11px", color: "#6b7280", margin: "8px 0",
                    borderTop: "1px solid #f3f4f6", paddingTop: "6px",
                    lineHeight: "1.5",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}>
                    {listing.description}
                  </p>
                )}

                {/* Dispatch badge for logistics */}
                {hasDispatch && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    margin: "8px 0 4px", padding: "6px 10px",
                    backgroundColor: "#fff7ed", border: "1px solid #fed7aa",
                    borderRadius: "8px",
                  }}>
                    <span style={{ fontSize: "14px" }}>🚚</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#c2410c" }}>
                      Active dispatch available
                    </span>
                  </div>
                )}

                {/* CTA */}
                {showViewLink && isLogistics && hasDispatch && (
                  <button
                    onClick={() => navigate("/dashboard/deliver/available")}
                    style={{
                      display: "block", width: "100%", marginTop: "6px",
                      padding: "7px 0", borderRadius: "8px", border: "none",
                      backgroundColor: "#ea580c", color: "#fff",
                      fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    View Available Dispatches →
                  </button>
                )}
                {showViewLink && listing.status === "available" && !hasDispatch && (
                  <button
                    onClick={() => navigate(`/dashboard/listings/${listing.id}`)}
                    style={{
                      display: "block", width: "100%", marginTop: "8px",
                      padding: "7px 0", borderRadius: "8px", border: "none",
                      backgroundColor: "#16a34a", color: "#fff",
                      fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    View &amp; Claim →
                  </button>
                )}
                {showViewLink && listing.status !== "available" && !hasDispatch && (
                  <button
                    onClick={() => navigate(`/dashboard/listings/${listing.id}`)}
                    style={{
                      display: "block", width: "100%", marginTop: "8px",
                      padding: "7px 0", borderRadius: "8px",
                      border: "1px solid #e5e7eb", backgroundColor: "transparent",
                      color: "#374151", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    View Details →
                  </button>
                )}
              </Popup>
            </Marker>
          );
        })}

        {/* ── Delivery routes (logistics only) ── */}
        {deliveryRoutes.map((route) => (
          <React.Fragment key={route.id}>
            {route.pickup && route.delivery && (
              <RoadRoute pickup={route.pickup} delivery={route.delivery} />
            )}
            {route.pickup && (
              <Marker position={route.pickup} icon={orangeIcon}>
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>📦 Pickup</p>
                    <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{route.title}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{route.pickupAddress}</p>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>Status: {route.status}</span>
                  </div>
                </Popup>
              </Marker>
            )}
            {route.delivery && (
              <Marker position={route.delivery} icon={greenIcon}>
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>🏠 Delivery</p>
                    <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{route.title}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{route.deliveryAddress}</p>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>Status: {route.status}</span>
                  </div>
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
