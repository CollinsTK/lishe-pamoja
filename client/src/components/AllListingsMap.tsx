import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Listing } from "@/types";

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

export { redIcon, greenIcon };

interface AllListingsMapProps {
  listings: Listing[];
  height?: string;
  showViewLink?: boolean;
}

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];

export default function AllListingsMap({ listings, height = "400px", showViewLink = true }: AllListingsMapProps) {
  const navigate = useNavigate();

  const validListings = listings.filter(
    (l) => l.location?.lat && l.location?.lng
  );

  const center: [number, number] =
    validListings.length > 0
      ? [validListings[0].location.lat, validListings[0].location.lng]
      : DEFAULT_CENTER;

  const statusColors: Record<string, string> = {
    available: "#16a34a",
    partially_claimed: "#d97706",
    fully_claimed: "#6b7280",
    expired: "#dc2626",
    cancelled: "#6b7280",
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validListings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.location.lat, listing.location.lng]}
            icon={redIcon}
          >
            <Popup>
              <div className="min-w-[160px] space-y-1">
                <p className="font-semibold text-sm leading-tight">{listing.title}</p>
                <p className="text-xs text-gray-500">{listing.vendorName}</p>
                <p className="text-xs">{listing.location.address}</p>
                <span
                  className="inline-block text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: statusColors[listing.status] ?? "#6b7280" }}
                >
                  {listing.status.replace("_", " ")}
                </span>
                {showViewLink && (
                  <div className="pt-1">
                    <button
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      className="text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      View listing →
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
