import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Truck, Package, MapPin, CheckSquare, Clock } from "lucide-react";

export default function DeliverOverview() {
  const { capabilities } = useAuth();

  if (!capabilities.canDeliver) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-2xl font-bold mb-4">Subscription Required</h2>
        <p className="text-muted-foreground mb-6">
          You need a Logistics or Business subscription to access this feature.
        </p>
        <Button asChild>
          <Link to="/dashboard/subscription">View Plans</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Delivery Dashboard</h1>
        <p className="text-muted-foreground">Manage your delivery dispatches and routes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Dispatches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting pickup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Being delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES 0</div>
            <p className="text-xs text-muted-foreground">Delivery fees earned</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your deliveries</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline">
              <Link to="/dashboard/deliver/active">View Active Dispatches</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/deliver/map">View Route Map</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/deliver/completed">View Completed</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Tips for successful deliveries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Keep your phone charged and location on</p>
            <p>• Pick up orders promptly at scheduled times</p>
            <p>• Handle food items with care during transport</p>
            <p>• Confirm delivery with recipients</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
