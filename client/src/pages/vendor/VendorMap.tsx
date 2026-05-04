import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import AllListingsMap from "@/components/AllListingsMap";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function VendorMap() {
  const { user } = useAuth();
  const { listings } = useData();
  const vendorId = user?.id ?? "";
  const vendorListings = listings.filter((l) => l.vendorId === vendorId);
  const mappable = vendorListings.filter((l) => l.location?.lat && l.location?.lng);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">My Listings Map</h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="w-4 h-4 text-destructive" />
          {mappable.length} listing{mappable.length !== 1 ? "s" : ""} on map
        </span>
      </div>

      {mappable.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-primary/30" />
          <p className="font-medium">No mapped listings yet.</p>
          <p className="text-sm mt-1">Create a listing with a location to see it here.</p>
        </Card>
      ) : (
        <AllListingsMap listings={vendorListings} height="calc(100vh - 200px)" showViewLink={false} />
      )}
    </div>
  );
}
