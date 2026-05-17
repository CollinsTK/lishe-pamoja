import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Package, ShoppingBag, Users, TrendingUp, DollarSign, Truck,
  Store, Leaf, RefreshCw, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/contexts/DataContext";

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

export default function AdminDashboard() {
  const { listings, orders, dispatches, users, subscriptionPlans, fetchData, isLoading } = useData();

  useEffect(() => { fetchData(); }, []);

  // ── Users breakdown ──
  const vendors   = users.filter(u => u.capabilities?.canSell);
  const riders    = users.filter(u => u.capabilities?.canDeliver);
  const suspended = users.filter(u => u.subscription?.status === "suspended");
  const activeSubUsers = users.filter(u => u.subscription?.status === "active" && u.subscription?.plan !== "free");

  // ── Listings ──
  const activeListings  = listings.filter(l => l.status === "available" || l.status === "partially_claimed");
  const claimedListings = listings.filter(l => l.status === "claimed" || l.status === "fully_claimed");
  const freeListings    = listings.filter(l => l.isFree);

  // ── Orders / Transactions ──
  const pendingOrders   = orders.filter(o => o.status === "AWAITING_CONFIRMATION" || o.status === "Pending");
  const completedOrders = orders.filter(o => o.status === "DELIVERED" || o.status === "Completed" || o.status === "Confirmed");
  const cancelledOrders = orders.filter(o => o.status === "Cancelled" || o.status === "CANCELLED");
  const totalRevenue    = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const deliveryRevenue = orders.filter(o => o.logisticsFee).reduce((s, o) => s + (o.logisticsFee || 0), 0);

  // ── Dispatches ──
  const activeDispatches    = dispatches.filter(d => d.status === "ASSIGNED" || d.status === "IN_TRANSIT");
  const completedDispatches = dispatches.filter(d => d.status === "DELIVERED" || d.status === "Delivered");
  const awaitingDispatches  = dispatches.filter(d => d.status === "AWAITING_RIDER");
  const fulfillmentRate = dispatches.length > 0 ? Math.round((completedDispatches.length / dispatches.length) * 100) : 0;

  const kpis = [
    { label: "Registered Users",   value: users.length,             sub: `${vendors.length} vendors · ${riders.length} riders`,   icon: Users,        color: "text-primary",      bg: "bg-primary/10" },
    { label: "Total Listings",     value: listings.length,          sub: `${activeListings.length} active · ${freeListings.length} free`, icon: Package, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Total Transactions", value: orders.length,            sub: `${pendingOrders.length} pending · ${completedOrders.length} done`, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Dispatches",         value: dispatches.length,        sub: `${activeDispatches.length} active · ${awaitingDispatches.length} awaiting`, icon: Truck, color: "text-orange-600", bg: "bg-orange-500/10" },
    { label: "Platform Revenue",   value: fmt(totalRevenue),        sub: `Delivery: ${fmt(deliveryRevenue)}`,                     icon: DollarSign,   color: "text-green-600",    bg: "bg-green-500/10" },
    { label: "Fulfillment Rate",   value: `${fulfillmentRate}%`,    sub: `${completedDispatches.length}/${dispatches.length} delivered`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-500/10" },
    { label: "Active Subscribers", value: activeSubUsers.length,    sub: `${suspended.length} suspended`,                        icon: CheckCircle2, color: "text-emerald-600",  bg: "bg-emerald-500/10" },
    { label: "Food Saved",         value: freeListings.length + claimedListings.length, sub: "listings rescued from waste",      icon: Leaf,         color: "text-teal-600",     bg: "bg-teal-500/10" },
  ];

  // ── Charts ──
  const orderStatusData = [
    { name: "Pending",   value: pendingOrders.length,   fill: "#f59e0b" },
    { name: "Completed", value: completedOrders.length, fill: "#22c55e" },
    { name: "Cancelled", value: cancelledOrders.length, fill: "#ef4444" },
    { name: "Active",    value: orders.filter(o => o.status === "ASSIGNED" || o.status === "IN_TRANSIT").length, fill: "#3b82f6" },
  ].filter(d => d.value > 0);

  const userBreakdownData = [
    { name: "Browse Only", value: users.filter(u => !u.capabilities?.canSell && !u.capabilities?.canDeliver && !u.isAdmin).length },
    { name: "Vendors",     value: vendors.length },
    { name: "Riders",      value: riders.length },
    { name: "Admins",      value: users.filter(u => u.isAdmin).length },
  ].filter(d => d.value > 0);

  const listingStatusData = [
    { name: "Available",       value: listings.filter(l => l.status === "available").length },
    { name: "Partially Claimed", value: listings.filter(l => l.status === "partially_claimed").length },
    { name: "Claimed",         value: claimedListings.length },
  ].filter(d => d.value > 0);

  const categoryData = Object.entries(
    listings.reduce((acc: Record<string, number>, l) => {
      acc[l.category] = (acc[l.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time summary of all Lishe Pamoja activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg} shrink-0`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-heading font-bold text-lg leading-tight ${k.color}`}>
                {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">{k.label}</p>
              <p className="text-[10px] text-muted-foreground/70 truncate">{k.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick status strips */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <p className="font-bold text-lg">{pendingOrders.length}</p>
            <p className="text-xs text-muted-foreground">Pending transactions</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Truck className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <p className="font-bold text-lg">{awaitingDispatches.length}</p>
            <p className="text-xs text-muted-foreground">Awaiting rider pickup</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <XCircle className="w-4 h-4 text-destructive shrink-0" />
          <div>
            <p className="font-bold text-lg">{cancelledOrders.length}</p>
            <p className="text-xs text-muted-foreground">Cancelled orders</p>
          </div>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Transaction Status Breakdown</h3>
          {orderStatusData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No transaction data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {orderStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">User Capabilities Breakdown</h3>
          {userBreakdownData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No user data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={userBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {userBreakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Listings by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No listing data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="name" type="category" fontSize={11} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} name="Listings" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Listing Status Breakdown</h3>
          {listingStatusData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No listing data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={listingStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {listingStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Platform health summary */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Platform Health Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Vendor adoption</p>
            <p className="font-bold text-lg">{users.length > 0 ? Math.round((vendors.length / users.length) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">{vendors.length} of {users.length} users</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rider adoption</p>
            <p className="font-bold text-lg">{users.length > 0 ? Math.round((riders.length / users.length) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">{riders.length} of {users.length} users</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Delivery rate</p>
            <p className="font-bold text-lg">{orders.length > 0 ? Math.round((orders.filter(o => o.fulfillmentMode === "Delivery").length / orders.length) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">of orders use delivery</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Free listing ratio</p>
            <p className="font-bold text-lg">{listings.length > 0 ? Math.round((freeListings.length / listings.length) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">{freeListings.length} of {listings.length} free</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
