import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

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

export interface LocationValue {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  label?: string;
  height?: string;
}

function MapClickHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (prevRef.current && prevRef.current.lat === lat && prevRef.current.lng === lng) return;
    prevRef.current = { lat, lng };
    map.flyTo([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function forwardGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export default function LocationPicker({ value, onChange, label = "Location", height = "240px" }: LocationPickerProps) {
  const [searchText, setSearchText] = useState(value.address);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      setSearchText(value.address);
    }
  }, [value.address]);

  const handleMapClick = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    const address = await reverseGeocode(lat, lng);
    setSearchText(address);
    onChange({ lat, lng, address });
    setIsGeocoding(false);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setIsGeocoding(true);
    const coords = await forwardGeocode(searchText.trim());
    if (coords) {
      onChange({ lat: coords.lat, lng: coords.lng, address: searchText.trim() });
    }
    setIsGeocoding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5 text-destructive" />
        {label}
      </Label>

      <div className="flex gap-2">
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an address or click the map…"
          disabled={isGeocoding}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={isGeocoding}
          title="Search address"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
        <MapContainer
          center={[value.lat, value.lng]}
          zoom={15}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMove={handleMapClick} />
          <FlyTo lat={value.lat} lng={value.lng} />
          <Marker
            position={[value.lat, value.lng]}
            icon={redIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const marker = e.target as L.Marker;
                const { lat, lng } = marker.getLatLng();
                handleMapClick(lat, lng);
              },
            }}
          />
        </MapContainer>
      </div>

      {isGeocoding && (
        <p className="text-xs text-muted-foreground animate-pulse">Looking up location…</p>
      )}
    </div>
  );
}
