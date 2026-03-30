import { MapPin } from "lucide-react";
import { sampleListings } from "@/data/sampleData";
import { ListingCard } from "@/components/ListingCard";

export default function RecipientMap() {
  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-heading font-bold text-xl">Nearby Listings</h2>

      {/* Map placeholder */}
      <div className="h-56 rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
        <MapPin className="w-10 h-10 mb-2 text-primary/40" />
        <p className="text-sm font-medium">Map View</p>
        <p className="text-xs">Interactive map coming soon</p>
      </div>

      {/* List view */}
      <p className="text-xs text-muted-foreground">{sampleListings.length} listings near Nairobi</p>
      <div className="space-y-3">
        {sampleListings.filter(l => l.status === "Available").map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
