import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useState } from "react";
import { toast } from "sonner";

const categories = ["Vegetables", "Bakery", "Fruits", "Cooked Meals", "Dairy", "Grains"];
const units = ["kg", "pieces", "packets", "loaves", "plates", "bags"];

export default function VendorListings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listings, updateListing, deleteListing } = useData();
  const vendorId = user?.id ?? "";
  const vendorListings = listings.filter((listing) => listing.vendorId === vendorId);

  const [editingListing, setEditingListing] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", quantity: "", unit: "kg", price: "", category: "", isFree: false });

  const openEdit = (listing: any) => {
    setEditingListing(listing);
    setFormData({
      title: listing.title,
      quantity: listing.quantity.toString(),
      unit: listing.unit,
      price: listing.price?.toString() || "",
      category: listing.category,
      isFree: listing.isFree || false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.quantity || !formData.category) {
      toast.error("Please fill in required fields");
      return;
    }

    updateListing(editingListing.id, {
      title: formData.title,
      quantity: parseInt(formData.quantity),
      unit: formData.unit,
      price: formData.isFree ? 0 : parseInt(formData.price || "0"),
      category: formData.category,
      isFree: formData.isFree,
    });

    toast.success("Listing updated successfully");
    setIsDialogOpen(false);
  };

  const handleDelete = (listingId: string) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      deleteListing(listingId);
      toast.success("Listing deleted");
    }
  };

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
                <button className="p-2 rounded-lg hover:bg-muted" onClick={() => openEdit(listing)} title="Edit listing">
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded-lg hover:bg-destructive/10" onClick={() => handleDelete(listing.id)} title="Delete listing">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isFree"
                checked={formData.isFree}
                onCheckedChange={v => setFormData({...formData, isFree: !!v})}
              />
              <Label htmlFor="isFree" className="cursor-pointer">Free listing (no price)</Label>
            </div>
            {!formData.isFree && (
              <div className="space-y-2">
                <Label>Price per unit (KES)</Label>
                <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0" />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-hero text-primary-foreground">Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
