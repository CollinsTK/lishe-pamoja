import { sampleOrders } from "@/data/sampleData";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";

export default function VendorOrders() {
  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">Orders</h1>
      <div className="space-y-3">
        {sampleOrders.map((o) => (
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
        ))}
      </div>
    </div>
  );
}
