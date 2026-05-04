import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useData } from "@/contexts/DataContext";
import { MapPin, Package, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { redIcon, greenIcon } from "@/components/AllListingsMap";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];

export default function LogisticsMap() {
  const { dispatches, listings } = useData();

  const activeDispatches = dispatches.filter(
    (d: any) => !["Delivered", "Failed"].includes(d.status)
  );

  type RouteEntry = {
    id: string;
    title: string;
    status: string;
    pickup: [number, number] | null;
    pickupAddress: string;
    delivery: [number, number] | null;
    deliveryAddress: string;
  };

  const routes: RouteEntry[] = activeDispatches.map((d: any) => {
    const listingId = d.listingId?._id || d.listingId;
    const listing = listings.find((l) => l.id === listingId);

    const pickup: [number, number] | null =
      listing?.location?.lat && listing?.location?.lng
        ? [listing.location.lat, listing.location.lng]
        : null;

    const pickupAddress = listing?.location?.address || "Pickup location";

    const delivery: [number, number] | null =
      d.deliveryLocation?.lat && d.deliveryLocation?.lng
        ? [d.deliveryLocation.lat, d.deliveryLocation.lng]
        : null;

    const deliveryAddress =
      d.deliveryLocation?.address || d.dropoffAddress || "Delivery location";

    return {
      id: d._id || d.id,
      title: listing?.title || `Dispatch #${d._id?.slice(-6) || d.id}`,
      status: d.status || "Assigned",
      pickup,
      pickupAddress,
      delivery,
      deliveryAddress,
    };
  });

  const allPoints = routes.flatMap((r) => [r.pickup, r.delivery]).filter(Boolean) as [number, number][];
  const center: [number, number] = allPoints.length > 0 ? allPoints[0] : DEFAULT_CENTER;

  const hasRoutes = routes.some((r) => r.pickup || r.delivery);

  return (
    <div className="px-4 pt-4 space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">Route Map</h2>
        <span className="text-sm text-muted-foreground">{activeDispatches.length} active dispatch{activeDispatches.length !== 1 ? "es" : ""}</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Pickup point
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Delivery point
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-6 h-0.5 bg-blue-500" /> Route
        </span>
      </div>

      {!hasRoutes ? (
        <Card className="p-10 text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-primary/30" />
          <p className="font-medium">No active dispatches to show.</p>
          <p className="text-sm mt-1">Pickup and delivery routes will appear here once dispatches are assigned.</p>
        </Card>
      ) : (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: "calc(100vh - 260px)", minHeight: "360px" }}>
          <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routes.map((route) => (
              <React.Fragment key={route.id}>
                {route.pickup && (
                  <Marker position={route.pickup} icon={greenIcon}>
                    <Popup>
                      <div className="min-w-[150px] space-y-1">
                        <p className="font-semibold text-sm flex items-center gap-1">
                          <Package className="w-3 h-3" /> Pickup
                        </p>
                        <p className="text-xs font-medium">{route.title}</p>
                        <p className="text-xs text-gray-500">{route.pickupAddress}</p>
                        <span className="text-[10px] text-gray-400">Status: {route.status}</span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {route.delivery && (
                  <Marker position={route.delivery} icon={redIcon}>
                    <Popup>
                      <div className="min-w-[150px] space-y-1">
                        <p className="font-semibold text-sm flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Delivery
                        </p>
                        <p className="text-xs font-medium">{route.title}</p>
                        <p className="text-xs text-gray-500">{route.deliveryAddress}</p>
                        <span className="text-[10px] text-gray-400">Status: {route.status}</span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {route.pickup && route.delivery && (
                  <Polyline
                    positions={[route.pickup, route.delivery]}
                    pathOptions={{ color: "#3b82f6", weight: 3, dashArray: "6 4" }}
                  />
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
