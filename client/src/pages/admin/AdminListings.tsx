import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

export default function AdminListings() {
  const { listings, users } = useData();

  const getVendorName = (vendorId: string) => {
    const vendor = users.find(u => u.id === vendorId);
    return vendor?.name || "Unknown Vendor";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">Listings Moderation</h1>
        <Badge variant="outline">{listings.length} listings</Badge>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Listing</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Vendor</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Price</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No listings yet. Vendors will appear here once they post listings.
                  </td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{l.title}</td>
                    <td className="p-3 text-muted-foreground">{l.vendorName}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{l.category}</Badge></td>
                    <td className="p-3">{l.isFree ? "Free" : `KES ${l.price}`}</td>
                    <td className="p-3"><StatusBadge status={l.status} /></td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button className="p-1.5 rounded hover:bg-muted" title="View details"><Eye className="w-4 h-4 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded hover:bg-success/10" title="Approve" onClick={() => toast.success(`Listing "${l.title}" approved`)}><CheckCircle className="w-4 h-4 text-success" /></button>
                        <button className="p-1.5 rounded hover:bg-destructive/10" title="Remove" onClick={() => toast.error(`Listing "${l.title}" removed`)}><XCircle className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
