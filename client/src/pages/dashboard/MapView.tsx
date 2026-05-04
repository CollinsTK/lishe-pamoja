import { useData } from "@/contexts/DataContext";
import AllListingsMap from "@/components/AllListingsMap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function MapView() {
  const { listings, isLoading, startListingsPolling, stopListingsPolling } = useData();

  useEffect(() => {
    startListingsPolling();
    return () => stopListingsPolling();
  }, [startListingsPolling, stopListingsPolling]);

  const validListings = listings.filter((l) => l.location?.lat && l.location?.lng);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Map View</h1>
        <p className="text-muted-foreground">View available food listings near you</p>
      </div>

      <Card className="h-[600px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Interactive Map
              </CardTitle>
              <CardDescription>
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading listings...
                  </span>
                ) : (
                  <>Showing {validListings.length} listings with location data</>
                )}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {validListings.length} listings
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="h-[calc(100%-80px)] p-0">
          {validListings.length > 0 ? (
            <AllListingsMap listings={validListings} height="100%" showViewLink={true} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isLoading ? "Loading map data..." : "No listings with location data available"}
                </p>
                {!isLoading && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Listings will appear here when vendors add location information
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
