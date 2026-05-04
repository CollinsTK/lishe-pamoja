import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Clock } from "lucide-react";
import { Listing } from "@/types";
import { apiClient } from "@/lib/apiClient";

export default function BrowseListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await apiClient.get("/listings");
        setListings(data || []);
      } catch (error) {
        console.error("Failed to fetch listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const filteredListings = listings.filter(
    (listing) =>
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse Listings</h1>
        <p className="text-muted-foreground">Find surplus food available for claim or purchase</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <MapPin className="mr-2 h-4 w-4" />
          Map View
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredListings.map((listing) => (
          <Card key={listing.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{listing.title}</CardTitle>
                {listing.isFree ? (
                  <Badge variant="secondary">Free</Badge>
                ) : (
                  <Badge variant="outline">KES {listing.price}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {listing.location?.address || "Location TBD"}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Pickup: {new Date(listing.pickupStart).toLocaleDateString()}
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link to={`/dashboard/listings/${listing.id}`}>View Details</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No listings found</p>
        </div>
      )}
    </div>
  );
}
