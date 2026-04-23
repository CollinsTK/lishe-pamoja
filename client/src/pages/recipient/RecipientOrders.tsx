import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

export default function RecipientOrders() {
  const { user } = useAuth();
  const { orders } = useData();
  const recipientOrders = orders.filter((order) => order.recipientId === user?.id);

  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-heading font-bold text-xl">My Orders</h2>
      <div className="space-y-3">
        {recipientOrders.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No orders yet. Claim a listing and it will appear here.
          </Card>
        ) : (
          recipientOrders.map((order) => (
            <Card key={order.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{order.listingTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.orderType} • {order.fulfillmentMode}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{new Date(order.createdAt).toLocaleDateString("en-KE")}</span>
                <span className="font-heading font-bold text-foreground">KES {order.totalPrice}</span>
              </div>
              <div className="flex items-center gap-1 pt-2">
                {["Pending", "Confirmed", "Completed"].map((step, i) => {
                  const steps = ["Pending", "Confirmed", "Completed"];
                  const currentIdx = steps.indexOf(order.status);
                  const isActive = i <= currentIdx && order.status !== "Cancelled";
                  return (
                    <div key={step} className="flex items-center gap-1 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-primary" : "bg-border"}`} />
                      <div className={`flex-1 h-0.5 ${i < 2 ? (isActive && i < currentIdx ? "bg-primary" : "bg-border") : "hidden"}`} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Pending</span>
                <span>Confirmed</span>
                <span>Completed</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
