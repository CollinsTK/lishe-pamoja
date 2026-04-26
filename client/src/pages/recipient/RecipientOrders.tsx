import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function RecipientOrders() {
  const { user } = useAuth();
  const { orders, dispatches } = useData();
  const recipientOrders = orders.filter((order) => order.recipientId === user?.id);

  const downloadReport = () => {
    const reportData = recipientOrders.map(order => ({
      OrderID: order.id,
      Date: new Date(order.createdAt).toLocaleDateString("en-KE"),
      Item: order.listingTitle,
      Quantity: `${order.orderedQuantity} ${order.unit}`,
      Type: order.orderType,
      Fulfillment: order.fulfillmentMode,
      Status: order.status,
      TotalCost: `KES ${order.totalPrice}`
    }));
    
    const csv = Papa.unparse(reportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `my_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-heading font-bold text-xl">My Orders</h2>
        {recipientOrders.length > 0 && (
          <Button onClick={downloadReport} size="sm" variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Receipt
          </Button>
        )}
      </div>
      
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
                  <h3 className="font-semibold text-sm">{order.orderedQuantity} {order.unit} • {order.listingTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.orderType} • {order.fulfillmentMode}
                  </p>
                  {order.fulfillmentMode === "Delivery" && (() => {
                    const orderDispatch = dispatches.find((d) => d.orderId === order.id);
                    if (orderDispatch && orderDispatch.deliveryPin) {
                      return (
                        <p className="text-xs font-medium text-primary mt-1 bg-primary/10 inline-block px-2 py-0.5 rounded">
                          Delivery PIN: {orderDispatch.deliveryPin}
                        </p>
                      );
                    }
                    return null;
                  })()}
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
