import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Package, ShoppingBag, Users, TrendingUp, DollarSign, Truck } from "lucide-react";

const revenueData = [
  { month: "Oct", subscriptions: 25000, resale: 12000, logistics: 8000 },
  { month: "Nov", subscriptions: 28000, resale: 15000, logistics: 10000 },
  { month: "Dec", subscriptions: 32000, resale: 18000, logistics: 12000 },
  { month: "Jan", subscriptions: 35000, resale: 22000, logistics: 15000 },
  { month: "Feb", subscriptions: 38000, resale: 25000, logistics: 18000 },
];

const ordersOverTime = [
  { week: "W1", orders: 45 },
  { week: "W2", orders: 62 },
  { week: "W3", orders: 58 },
  { week: "W4", orders: 75 },
];

const kpis = [
  { label: "Total Listings", value: "1,247", icon: Package, change: "+12%" },
  { label: "Active Orders", value: "89", icon: ShoppingBag, change: "+8%" },
  { label: "Registered Users", value: "3,456", icon: Users, change: "+15%" },
  { label: "Fulfillment Rate", value: "87%", icon: TrendingUp, change: "+3%" },
  { label: "Monthly Revenue", value: "KES 81K", icon: DollarSign, change: "+22%" },
  { label: "Deliveries Made", value: "234", icon: Truck, change: "+18%" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">Platform Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <k.icon className="w-5 h-5 text-primary" />
              <span className="text-xs text-success font-medium">{k.change}</span>
            </div>
            <p className="font-heading font-bold text-xl">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
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
        <h3 className="font-heading font-semibold mb-4">Weekly Orders Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ordersOverTime}>
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
