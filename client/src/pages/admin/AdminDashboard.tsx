import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Package, ShoppingBag, Users, TrendingUp, DollarSign, Truck } from "lucide-react";
import { useData } from "@/contexts/DataContext";

export default function AdminDashboard() {
  const { listings, orders, dispatches, users, subscriptionPlans } = useData();

  // Calculate real KPIs
  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.status === "Available").length;
  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => o.status === "Pending" || o.status === "Confirmed").length;
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === "Active").length;
  const completedDispatches = dispatches.filter(d => d.status === "Delivered").length;
  const totalDispatches = dispatches.length;
  const fulfillmentRate = totalDispatches > 0 ? Math.round((completedDispatches / totalDispatches) * 100) : 0;
  
  // Calculate revenue from orders
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const subscriptionRevenue = subscriptionPlans.reduce((sum, p) => sum + p.price, 0);

  const kpis = [
    { label: "Total Listings", value: totalListings.toString(), icon: Package, sub: `${activeListings} active` },
    { label: "Active Orders", value: activeOrders.toString(), icon: ShoppingBag, sub: `${totalOrders} total` },
    { label: "Registered Users", value: totalUsers.toString(), icon: Users, sub: `${activeUsers} active` },
    { label: "Fulfillment Rate", value: `${fulfillmentRate}%`, icon: TrendingUp, sub: `${completedDispatches}/${totalDispatches} deliveries` },
    { label: "Total Revenue", value: `KES ${totalRevenue.toLocaleString()}`, icon: DollarSign, sub: `+ KES ${subscriptionRevenue}/mo subs` },
    { label: "Deliveries Made", value: completedDispatches.toString(), icon: Truck, sub: `${totalDispatches} total dispatches` },
  ];

  // Revenue by month (simulated from real data)
  const revenueData = [
    { month: "Oct", subscriptions: 25000, resale: Math.round(totalRevenue * 0.15), logistics: Math.round(totalRevenue * 0.1) },
    { month: "Nov", subscriptions: 28000, resale: Math.round(totalRevenue * 0.18), logistics: Math.round(totalRevenue * 0.12) },
    { month: "Dec", subscriptions: 32000, resale: Math.round(totalRevenue * 0.2), logistics: Math.round(totalRevenue * 0.15) },
    { month: "Jan", subscriptions: 35000, resale: Math.round(totalRevenue * 0.25), logistics: Math.round(totalRevenue * 0.18) },
    { month: "Feb", subscriptions: subscriptionRevenue * 2, resale: Math.round(totalRevenue * 0.3), logistics: Math.round(totalRevenue * 0.2) },
  ];

  // Orders over time (based on real orders)
  const ordersByStatus = [
    { week: "Pending", orders: orders.filter(o => o.status === "Pending").length },
    { week: "Confirmed", orders: orders.filter(o => o.status === "Confirmed").length },
    { week: "Completed", orders: orders.filter(o => o.status === "Completed").length },
    { week: "Cancelled", orders: orders.filter(o => o.status === "Cancelled").length },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">Platform Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <k.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="font-heading font-bold text-xl">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{k.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-4">Revenue Streams (KES)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 88%)" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="subscriptions" fill="hsl(145, 55%, 32%)" radius={[4, 4, 0, 0]} name="Subscriptions" />
            <Bar dataKey="resale" fill="hsl(32, 90%, 55%)" radius={[4, 4, 0, 0]} name="Resale" />
            <Bar dataKey="logistics" fill="hsl(200, 60%, 50%)" radius={[4, 4, 0, 0]} name="Logistics" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-4">Orders by Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ordersByStatus}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 88%)" />
            <XAxis dataKey="week" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="orders" stroke="hsl(145, 55%, 32%)" strokeWidth={2} dot={{ fill: "hsl(145, 55%, 32%)" }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
