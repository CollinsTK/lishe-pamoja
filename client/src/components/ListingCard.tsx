import { useExpiryCountdown } from "@/hooks/useExpiryCountdown";
import { Listing } from "@/types";
import { Clock, MapPin, Truck, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface ListingCardProps {
  listing: Listing;
  basePath?: string;
}

export function ListingCard({ listing, basePath = "/listing" }: ListingCardProps) {
  const { timeLeft, isUrgent, isExpired } = useExpiryCountdown(listing.expiryDateTime);
  const navigate = useNavigate();

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-elevated transition-all duration-300 group"
      onClick={() => navigate(`${basePath}/${listing.id}`)}
    >
      <div className="relative h-36 bg-muted flex items-center justify-center overflow-hidden">
        <div className="text-4xl">
          {listing.category === "Vegetables" && "🥬"}
          {listing.category === "Bakery" && "🍞"}
          {listing.category === "Fruits" && "🥭"}
          {listing.category === "Cooked Meals" && "🍛"}
          {listing.category === "Dairy" && "🥛"}
          {listing.category === "Grains" && "🌾"}
          {listing.category === "Beverages" && "🧃"}
          {listing.category === "Other" && "📦"}
        </div>

        <div className="absolute top-2 left-2 flex gap-1.5">
          {listing.isFree && (
            <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5">
              <Gift className="w-3 h-3 mr-1" /> Free
            </Badge>
          )}
          {listing.deliveryAllowed && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              <Truck className="w-3 h-3 mr-1" /> Delivery
            </Badge>
          )}
        </div>

        <div className="absolute top-2 right-2">
          <Badge
            variant={isExpired ? "destructive" : isUrgent ? "destructive" : "outline"}
            className={`text-xs font-mono ${isUrgent && !isExpired ? "animate-pulse" : ""}`}
          >
            <Clock className="w-3 h-3 mr-1" />
            {timeLeft}
          </Badge>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="font-heading font-semibold text-sm leading-tight group-hover:text-primary transition-colors truncate">
          {listing.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {listing.vendorName}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {listing.location.address}
          </span>
          {!listing.isFree && (
            <span className="font-heading font-bold text-sm text-primary">
              KES {listing.price} <span className="text-[10px] font-normal text-muted-foreground">/ {listing.unit}</span>
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {listing.quantity} {listing.unit} available
        </p>
      </div>
    </Card>
  );
}
