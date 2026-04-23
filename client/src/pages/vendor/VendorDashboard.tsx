import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ShoppingBag, TrendingUp, Plus, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listings, orders } = useData();
  const vendorId = user?.id ?? "";
  const vendorListings = listings.filter((l) => l.vendorId === vendorId);
  const vendorOrders = orders.filter((o) => o.vendorId === vendorId);

  const stats = [
    { label: "Active Listings", value: vendorListings.filter((l) => l.status === "Available").length, icon: Package, color: "text-primary" },
    { label: "Total Orders", value: vendorOrders.length, icon: ShoppingBag, color: "text-secondary" },
    { label: "Fulfillment Rate", value: "85%", icon: TrendingUp, color: "text-success" },
    { label: "Expiring Soon", value: 1, icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">Dashboard</h1>
        <Button onClick={() => navigate("/vendor/create")} className="bg-gradient-hero text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Listing
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="font-heading font-bold text-2xl">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <h3 className="font-heading font-semibold mb-3">Recent Orders</h3>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Order</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Listing</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {vendorOrders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{o.id}</td>
                    <td className="p-3">{o.listingTitle}</td>
                    <td className="p-3 text-xs">{o.fulfillmentMode}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        o.status === "Completed" ? "bg-success/10 text-success" :
                        o.status === "Pending" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                      }`}>{o.status}</span>
                    </td>
                    <td className="p-3 text-right font-heading font-semibold">KES {o.totalPrice}</td>
                  </tr>
                ))}
                {vendorOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No orders yet. Your current orders will appear here once a recipient makes a claim.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
