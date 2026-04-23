import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

export default function VendorOrders() {
  const { user } = useAuth();
  const { orders } = useData();
  const vendorOrders = orders.filter((o) => o.vendorId === user?.id);

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">Orders</h1>
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
                  <h3 className="font-semibold text-sm">{o.listingTitle}</h3>
                  <p className="text-xs text-muted-foreground">{o.orderType} • {o.fulfillmentMode}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{new Date(o.createdAt).toLocaleDateString("en-KE")}</span>
                <span className="font-heading font-bold text-foreground">KES {o.totalPrice}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
