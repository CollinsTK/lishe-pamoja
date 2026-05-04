import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock } from "lucide-react";
import { Order } from "@/types";
import { apiClient } from "@/lib/apiClient";

const statusColors: Record<string, string> = {
  CLAIMED: "bg-yellow-500",
  LOGISTICS_ASSIGNED: "bg-blue-500",
  IN_TRANSIT: "bg-purple-500",
  DELIVERED: "bg-green-500",
  COMPLETED: "bg-green-600",
  CANCELLED: "bg-red-500",
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await apiClient.get("/transactions/orders");
        setOrders(data || []);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground">Track your food claims and purchases</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{order.listingTitle}</CardTitle>
                  <CardDescription>
                    Order #{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge className={statusColors[order.status] || "bg-gray-500"}>{order.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Quantity</p>
                    <p className="text-sm text-muted-foreground">
                      {order.orderedQuantity} {order.unit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm text-muted-foreground">{order.orderType}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-sm text-muted-foreground">KES {order.totalPrice}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {orders.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders yet</p>
              <p className="text-sm text-muted-foreground">Start browsing to claim or purchase food</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
