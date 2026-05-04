import { useData } from "@/contexts/DataContext";
import AllListingsMap from "@/components/AllListingsMap";
import { ListingCard } from "@/components/ListingCard";
import { MapPin } from "lucide-react";

export default function RecipientMap() {
  const { listings } = useData();
  const activeListings = listings.filter(
    (l) => l.status === "available" || l.status === "partially_claimed"
  );

  return (
    <div className="px-4 pt-4 space-y-4 pb-6">
      <h2 className="font-heading font-bold text-xl">Nearby Listings</h2>

      <AllListingsMap listings={activeListings} height="320px" showViewLink={true} />

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3 text-destructive" />
        {activeListings.length} listing{activeListings.length !== 1 ? "s" : ""} available
      </p>

      <div className="space-y-3">
        {activeListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}

