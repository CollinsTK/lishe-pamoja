import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, Package, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Listing } from "@/types";

interface ListingResponse {
  listings: Listing[];
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
}

export default function VendorListings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { removeListingFromCart } = useCart();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchListings = async (page = 1, status?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString() });
      if (status && status !== "all") params.append('status', status);
      
      const response = await apiClient.get(`/listings/my?${params.toString()}`) as any;
      const mapped = (response.listings || []).map((l: any) => ({
        ...l,
        id: l._id || l.id,
        quantity: l.availableQuantity ?? l.quantity,
      }));
      setListings(mapped);
      setTotalPages(response.pagination?.pages ?? 1);
      setCurrentPage(response.pagination?.current ?? 1);
    } catch (error) {
      toast.error("Failed to fetch listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings(1, statusFilter);
  }, [statusFilter]);

  const handleDelete = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      return;
    }

    setDeletingId(listingId);
    try {
      await apiClient.delete(`/listings/${listingId}`);
      setListings(prev => prev.filter(l => l.id !== listingId));
      removeListingFromCart(listingId);
      toast.success("Listing deleted successfully");
    } catch (error: any) {
      if (error.response?.data?.message?.includes("active transactions")) {
        toast.error("Cannot delete listing with active transactions. Please complete or cancel all transactions first.");
      } else {
        toast.error(error.response?.data?.message || "Failed to delete listing");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'partially_claimed': return 'bg-yellow-100 text-yellow-800';
      case 'fully_claimed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'Vegetables': '🥬',
      'Fruits': '🥭',
      'Bakery': '🍞',
      'Dairy': '🥛',
      'Grains': '🌾',
      'Cooked Meals': '🍛',
      'Beverages': '🧃',
      'Other': '📦'
    };
    return emojiMap[category] || '📦';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">My Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your food surplus listings</p>
        </div>
        <Button onClick={() => navigate("/dashboard/sell/create")} className="bg-gradient-hero text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Listing
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="partially_claimed">Partially Claimed</SelectItem>
              <SelectItem value="fully_claimed">Fully Claimed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-xs">
          {listings.length} of {totalPages * 20} listings
        </Badge>
      </div>

      {/* Listings */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No listings found</h3>
          <p className="text-muted-foreground mb-4">
            {statusFilter === "all" 
              ? "Start by creating your first food surplus listing."
              : `No listings with status "${statusFilter}" found.`}
          </p>
          {statusFilter === "all" && (
            <Button onClick={() => navigate("/dashboard/sell/create")} className="bg-gradient-hero text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Create First Listing
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Category Icon */}
                <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center text-2xl flex-shrink-0">
                  {getCategoryEmoji(listing.category)}
                </div>

                {/* Listing Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{listing.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{listing.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium">
                          {listing.availableQuantity} / {listing.originalQuantity} {listing.unit}
                        </span>
                        <span className="text-muted-foreground">
                          {listing.isFree ? "Free" : `KES ${listing.price}/${listing.unit}`}
                        </span>
                        <span className="text-muted-foreground">
                          Expires: {new Date(listing.expiryDateTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(listing.status)}>
                        {listing.status.replace('_', ' ')}
                      </Badge>
                      {listing.availableQuantity < listing.originalQuantity && (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertCircle className="w-3 h-3" />
                          Partially claimed
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button 
                    className="p-2 rounded-lg hover:bg-muted transition-colors" 
                    onClick={() => navigate(`/dashboard/sell/edit/${listing.id}`)} 
                    title="Edit listing"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button 
                    className="p-2 rounded-lg hover:bg-muted transition-colors" 
                    onClick={() => navigate(`/listings/${listing.id}`)} 
                    title="View listing"
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button 
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" 
                    onClick={() => handleDelete(listing.id)} 
                    title="Delete listing"
                    disabled={deletingId === listing.id}
                  >
                    <Trash2 className={`w-4 h-4 ${deletingId === listing.id ? 'text-muted-foreground animate-pulse' : 'text-destructive'}`} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchListings(currentPage - 1, statusFilter)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchListings(currentPage + 1, statusFilter)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
