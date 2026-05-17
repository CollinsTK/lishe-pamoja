import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// ── Auto-fit bounds around the route ─────────────────────────────────────────
function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || coords.length < 2) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(coords), { padding: [48, 48] });
  }, [map, coords]);
  return null;
}

// ── Fetch best road route from OSRM ──────────────────────────────────────────
async function fetchOsrmRoute(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
): Promise<{ coords: [number, number][]; distanceKm: number; durationMin: number } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson&steps=false`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );
    return {
      coords,
      distanceKm: +(route.distance / 1000).toFixed(1),
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

export interface DispatchRouteMapProps {
  pickup:   { lat: number; lng: number; address?: string };
  delivery: { lat: number; lng: number; address?: string };
  height?: string;
}

export default function DispatchRouteMap({ pickup, delivery, height = "240px" }: DispatchRouteMapProps) {
  const pickupPos:   [number, number] = [pickup.lat,   pickup.lng];
  const deliveryPos: [number, number] = [delivery.lat, delivery.lng];

  const [routeCoords, setRouteCoords]   = useState<[number, number][]>([]);
  const [routeInfo,   setRouteInfo]     = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);

  // Fallback straight line if OSRM fails
  const displayCoords = routeCoords.length >= 2 ? routeCoords : [pickupPos, deliveryPos];

  useEffect(() => {
    let cancelled = false;
    setRouteLoading(true);
    fetchOsrmRoute(pickup, delivery).then((result) => {
      if (cancelled) return;
      if (result) {
        setRouteCoords(result.coords);
        setRouteInfo({ distanceKm: result.distanceKm, durationMin: result.durationMin });
      } else {
        setRouteCoords([pickupPos, deliveryPos]);
      }
      setRouteLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup.lat, pickup.lng, delivery.lat, delivery.lng]);

  const midLat = (pickup.lat + delivery.lat) / 2;
  const midLng = (pickup.lng + delivery.lng) / 2;

  return (
    <div className="space-y-1.5">
      {/* Route info bar */}
      <div className="flex items-center gap-3 text-xs px-1">
        {routeLoading ? (
          <span className="text-muted-foreground animate-pulse">Calculating best route…</span>
        ) : routeInfo ? (
          <>
            <span className="flex items-center gap-1 font-semibold text-foreground">
              🛣️ {routeInfo.distanceKm} km
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              🕐 ~{routeInfo.durationMin} min by road
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-[11px]">Showing straight-line (road data unavailable)</span>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm" style={{ height }}>
        <MapContainer
          center={[midLat, midLng]}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={false}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!routeLoading && <FitRoute coords={displayCoords} />}

          {/* Road route — red, thick, like Google Maps */}
          <Polyline
            positions={displayCoords}
            pathOptions={{
              color: "#E8371B",
              weight: 6,
              opacity: 0.9,
              lineJoin: "round",
              lineCap: "round",
            }}
          />
          {/* White border underneath for contrast */}
          <Polyline
            positions={displayCoords}
            pathOptions={{
              color: "#ffffff",
              weight: 10,
              opacity: 0.35,
              lineJoin: "round",
              lineCap: "round",
            }}
          />

          {/* Pickup marker — orange */}
          <Marker position={pickupPos} icon={orangeIcon}>
            <Popup>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#ea580c" }}>📦 Pickup Point</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{pickup.address ?? "Vendor location"}</div>
            </Popup>
          </Marker>

          {/* Delivery marker — green */}
          <Marker position={deliveryPos} icon={greenIcon}>
            <Popup>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>🏠 Drop-off Point</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{delivery.address ?? "Recipient location"}</div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
          {pickup.address ? pickup.address.split(",")[0] : "Pickup"}
        </span>
        <span className="text-muted-foreground/40 mx-1">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
          {delivery.address ? delivery.address.split(",")[0] : "Drop-off"}
        </span>
      </div>
    </div>
  );
}
