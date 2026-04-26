import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

const statusOptions = ["Pending", "Confirmed", "Ready", "Completed", "Cancelled"];

export default function VendorOrders() {
  const { user } = useAuth();
  const { orders, updateOrder, dispatches } = useData();
  const vendorOrders = orders.filter((o) => o.vendorId === user?.id);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrder(orderId, { status: newStatus });
    toast.success(`Order status updated to ${newStatus}`);
  };

  // Calculate stats
  const pendingCount = vendorOrders.filter(o => o.status === "Pending").length;
  const confirmedCount = vendorOrders.filter(o => o.status === "Confirmed" || o.status === "Ready").length;
  const completedCount = vendorOrders.filter(o => o.status === "Completed").length;
  const totalRevenue = vendorOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">Orders</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="font-heading font-bold text-xl text-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-heading font-bold text-xl text-primary">{confirmedCount}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-heading font-bold text-xl text-success">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-heading font-bold text-xl">KES {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </Card>
      </div>

      <div className="space-y-3">
        {vendorOrders.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No orders yet. Your buyers will appear here once a recipient places a claim or purchase.
          </Card>
        ) : (
          vendorOrders.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{o.orderedQuantity} {o.unit} • {o.listingTitle}</h3>
                  <p className="text-xs text-muted-foreground">{o.orderType} • {o.fulfillmentMode}</p>
                  {o.fulfillmentMode === "Delivery" && (() => {
                    const orderDispatch = dispatches.find((d) => d.orderId === o.id);
                    if (orderDispatch && orderDispatch.pickupPin) {
                      return (
                        <p className="text-xs font-medium text-primary mt-1 bg-primary/10 inline-block px-2 py-0.5 rounded">
                          Pickup PIN: {orderDispatch.pickupPin}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{new Date(o.createdAt).toLocaleDateString("en-KE")}</span>
                <span className="font-heading font-bold text-foreground">KES {o.totalPrice}</span>
              </div>
              {/* Status update for vendor */}
              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Update Status:</span>
                <Select value={o.status} onValueChange={(v) => handleStatusChange(o.id, v)}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
