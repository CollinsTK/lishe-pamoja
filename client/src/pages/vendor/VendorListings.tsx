import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

export default function VendorListings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listings } = useData();
  const vendorId = user?.id ?? "";
  const vendorListings = listings.filter((listing) => listing.vendorId === vendorId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">My Listings</h1>
        <Button onClick={() => navigate("/vendor/create")} className="bg-gradient-hero text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New
        </Button>
      </div>

      <div className="space-y-3">
        {vendorListings.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No listings yet. Publish a listing to make it available to recipients.
          </Card>
        ) : (
          vendorListings.map((listing) => (
            <Card key={listing.id} className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                {listing.category === "Vegetables" && "🥬"}
                {listing.category === "Bakery" && "🍞"}
                {listing.category === "Fruits" && "🥭"}
                {listing.category === "Cooked Meals" && "🍛"}
                {listing.category === "Dairy" && "🥛"}
                {listing.category === "Grains" && "🌾"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{listing.title}</h3>
                <p className="text-xs text-muted-foreground">{listing.quantity} {listing.unit} • {listing.isFree ? "Free" : `KES ${listing.price}`}</p>
              </div>
              <StatusBadge status={listing.status} />
              <div className="flex gap-1">
                <button className="p-2 rounded-lg hover:bg-muted"><Edit className="w-4 h-4 text-muted-foreground" /></button>
                <button className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
