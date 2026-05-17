import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import { useData } from "@/contexts/DataContext";
import Papa from "papaparse";
import {
  Download, RefreshCw, Printer, LayoutDashboard, Users,
  TrendingUp, Package, Truck,
} from "lucide-react";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#22c55e","#f59e0b","#3b82f6","#ef4444","#8b5cf6","#06b6d4"];

function csvDownload(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.setAttribute("download", filename);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const pct = (a: number, b: number) => b === 0 ? "—" : `${Math.round((a / b) * 100)}%`;
const today = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

type ReportTab = "overview" | "users" | "revenue" | "listings" | "logistics";

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "System Overview",  icon: LayoutDashboard },
  { id: "users",     label: "Users",            icon: Users           },
  { id: "revenue",   label: "Revenue",          icon: TrendingUp      },
  { id: "listings",  label: "Listings",         icon: Package         },
  { id: "logistics", label: "Logistics",        icon: Truck           },
];

function StatRow({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-border/40 last:border-0 text-sm ${highlight ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-primary" : "font-semibold"}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">{children}</h3>;
}

export default function AdminReports() {
  const { listings, orders, dispatches, users, fetchData, isLoading } = useData();
  const [tab, setTab] = useState<ReportTab>("overview");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const now = new Date();

  // Orders
  const completedOrders     = orders.filter(o => o.status === "DELIVERED" || o.status === "COMPLETED");
  const cancelledOrders     = orders.filter(o => o.status === "CANCELLED");
  const deliveryOrders      = orders.filter(o => o.fulfillmentMode === "Delivery");
  const pickupOrders        = orders.filter(o => o.fulfillmentMode === "Pickup");
  const claimOrders         = orders.filter(o => o.orderType === "Claim");
  const purchaseOrders      = orders.filter(o => o.orderType === "Purchase");
  const totalRevenue        = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalDeliveryFees   = orders.reduce((s, o) => s + (o.logisticsFee || 0), 0);
  const avgOrderValue       = purchaseOrders.length ? totalRevenue / purchaseOrders.length : 0;

  // Dispatches
  const completedDispatches = dispatches.filter(d => d.status === "DELIVERED" || d.status === "Delivered");
  const activeDispatches    = dispatches.filter(d => d.status === "ASSIGNED" || d.status === "IN_TRANSIT");
  const awaitingDispatches  = dispatches.filter(d => d.status === "AWAITING_RIDER");
  const cancelledDispatches = dispatches.filter(d => d.status === "CANCELLED");

  // Listings
  const freeListings        = listings.filter(l => l.isFree);
  const paidListings        = listings.filter(l => !l.isFree);
  const availableListings   = listings.filter(l => l.status === "available");
  const partialListings     = listings.filter(l => l.status === "partially_claimed");
  const claimedListings     = listings.filter(l => l.status === "fully_claimed");
  const expiredListings     = listings.filter(l => l.status === "expired");
  const deliveryListings    = listings.filter(l => l.deliveryAllowed);
  const totalQty            = listings.reduce((s, l) => s + (l.quantity || 0), 0);

  // Users
  const vendors             = users.filter(u => u.capabilities?.canSell && !u.capabilities?.canDeliver);
  const riders              = users.filter(u => u.capabilities?.canDeliver && !u.capabilities?.canSell);
  const business            = users.filter(u => u.capabilities?.canSell && u.capabilities?.canDeliver);
  const browseOnly          = users.filter(u => !u.capabilities?.canSell && !u.capabilities?.canDeliver && !u.isAdmin);
  const admins              = users.filter(u => u.isAdmin);
  const suspended           = users.filter(u => u.subscription?.status === "suspended");
  const activeSubscribers   = users.filter(u => u.subscription?.status === "active" && u.subscription?.plan);
  const totalWalletBalance  = users.reduce((s, u) => s + (u.walletBalance || 0), 0);

  // Impact
  const mealsSaved  = completedOrders.length * 2;
  const co2Reduced  = Math.round(totalQty * 0.28);

  // ── Monthly buckets (last 6 months) ──────────────────────────────────────
  const buildMonthlyBuckets = <T extends Record<string, number>>(init: T) => {
    const buckets: Record<string, T & { month: string }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[`${d.getFullYear()}-${d.getMonth()}`] = { ...init, month: MONTH_LABELS[d.getMonth()] } as T & { month: string };
    }
    return buckets;
  };

  const orderBuckets = buildMonthlyBuckets({ orders: 0, deliveries: 0, pickups: 0, revenue: 0 });
  orders.forEach(o => {
    if (!o.createdAt) return;
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (orderBuckets[key]) {
      orderBuckets[key].orders++;
      if (o.fulfillmentMode === "Delivery") orderBuckets[key].deliveries++;
      else orderBuckets[key].pickups++;
      orderBuckets[key].revenue += o.totalPrice || 0;
    }
  });
  const monthlyOrders = Object.values(orderBuckets);

  const userBuckets = buildMonthlyBuckets({ users: 0 });
  users.forEach(u => {
    if (!u.createdAt) return;
    const d = new Date(u.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (userBuckets[key]) userBuckets[key].users++;
  });
  const monthlyUsers = Object.values(userBuckets);

  const listingBuckets = buildMonthlyBuckets({ listings: 0 });
  listings.forEach(l => {
    if (!l.createdAt) return;
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (listingBuckets[key]) listingBuckets[key].listings++;
  });
  const monthlyListings = Object.values(listingBuckets);

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryBreakdown = Object.entries(
    listings.reduce((acc: Record<string, number>, l) => {
      const c = l.category || "Uncategorised";
      acc[c] = (acc[c] || 0) + 1; return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // ── Dispatch status pie ────────────────────────────────────────────────────
  const dispatchPie = [
    { name: "Awaiting Rider", value: awaitingDispatches.length,  fill: "#f59e0b" },
    { name: "Active",         value: activeDispatches.length,    fill: "#3b82f6" },
    { name: "Delivered",      value: completedDispatches.length, fill: "#22c55e" },
    { name: "Cancelled",      value: cancelledDispatches.length, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── User role pie ─────────────────────────────────────────────────────────
  const userRolePie = [
    { name: "Browse Only", value: browseOnly.length,  fill: "#3b82f6" },
    { name: "Vendors",     value: vendors.length,     fill: "#22c55e" },
    { name: "Riders",      value: riders.length,      fill: "#f59e0b" },
    { name: "Business",    value: business.length,    fill: "#8b5cf6" },
    { name: "Admins",      value: admins.length,      fill: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── Listing status pie ────────────────────────────────────────────────────
  const listingStatusPie = [
    { name: "Available",      value: availableListings.length, fill: "#22c55e" },
    { name: "Partial",        value: partialListings.length,   fill: "#f59e0b" },
    { name: "Fully Claimed",  value: claimedListings.length,   fill: "#3b82f6" },
    { name: "Expired",        value: expiredListings.length,   fill: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── CSV exports ───────────────────────────────────────────────────────────
  const exportOverview = () => csvDownload([
    { Metric: "Total Users",              Value: users.length },
    { Metric: "Active Subscribers",       Value: activeSubscribers.length },
    { Metric: "Total Listings",           Value: listings.length },
    { Metric: "Total Transactions",       Value: orders.length },
    { Metric: "Completed Orders",         Value: completedOrders.length },
    { Metric: "Cancelled Orders",         Value: cancelledOrders.length },
    { Metric: "Total Revenue (KES)",      Value: totalRevenue },
    { Metric: "Total Delivery Fees (KES)",Value: totalDeliveryFees },
    { Metric: "Meals Rescued",            Value: mealsSaved },
    { Metric: "CO2 Reduced (kg)",         Value: co2Reduced },
    { Metric: "Total Dispatches",         Value: dispatches.length },
    { Metric: "Completed Deliveries",     Value: completedDispatches.length },
    { Metric: "Delivery Fulfilment Rate", Value: pct(completedDispatches.length, dispatches.length) },
  ], `overview_report_${now.toISOString().split("T")[0]}.csv`);

  const exportUsers = () => csvDownload(
    users.map(u => ({
      ID: u._id || u.id, Name: u.name, Email: u.email, Phone: u.phone || "",
      Role: u.isAdmin ? "Admin" : u.capabilities?.canSell && u.capabilities?.canDeliver ? "Business" : u.capabilities?.canSell ? "Vendor" : u.capabilities?.canDeliver ? "Rider" : "Browse",
      CanSell: u.capabilities?.canSell ? "Yes" : "No",
      CanDeliver: u.capabilities?.canDeliver ? "Yes" : "No",
      SubscriptionStatus: u.subscription?.status ?? "none",
      SubscriptionPlan: u.subscription?.plan ?? "none",
      WalletBalance: u.walletBalance || 0,
      Suspended: u.subscription?.status === "suspended" ? "Yes" : "No",
      Joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-KE") : "",
    })),
    `users_report_${now.toISOString().split("T")[0]}.csv`
  );

  const exportOrders = () => csvDownload(
    orders.map(o => ({
      "Transaction ID": o.id,
      Date: o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-KE") : "",
      Listing: o.listingTitle, Quantity: `${o.orderedQuantity} ${o.unit}`,
      Type: o.orderType, FulfillmentMode: o.fulfillmentMode, Status: o.status,
      "Base Price (KES)": o.basePrice, "Delivery Fee (KES)": o.logisticsFee, "Total (KES)": o.totalPrice,
    })),
    `orders_report_${now.toISOString().split("T")[0]}.csv`
  );

  const exportListings = () => csvDownload(
    listings.map(l => ({
      ID: l.id, Title: l.title, Category: l.category, Vendor: l.vendorName,
      Status: l.status, Free: l.isFree ? "Yes" : "No", "Price (KES)": l.price,
      "Available Qty": l.quantity, Unit: l.unit, "Delivery Allowed": l.deliveryAllowed ? "Yes" : "No",
      Location: l.location?.address || "",
      Expiry: l.expiryDateTime ? new Date(l.expiryDateTime).toLocaleDateString("en-KE") : "",
    })),
    `listings_report_${now.toISOString().split("T")[0]}.csv`
  );

  const exportLogistics = () => csvDownload(
    dispatches.map((d: any) => ({
      "Dispatch ID": d._id, Status: d.status,
      Listing: d.listingId?.title || "—", "Delivery Fee (KES)": d.deliveryFee || 0,
      "Rider Net (KES)": d.earnings?.riderNet || 0,
      "Platform Fee (KES)": d.earnings?.platformFee || 0,
      Settled: d.earnings?.settled ? "Yes" : "No",
      "Delivered At": d.timeline?.deliveredAt ? new Date(d.timeline.deliveredAt).toLocaleDateString("en-KE") : "—",
    })),
    `logistics_report_${now.toISOString().split("T")[0]}.csv`
  );

  // ── Render helpers ────────────────────────────────────────────────────────
  const EmptyChart = () => (
    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data yet</div>
  );

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Print styles injected via style tag */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-wrap gap-2 items-start justify-between no-print">
        <div>
          <h1 className="font-heading font-bold text-2xl">Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generated on {today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={fetchData} variant="ghost" size="sm" disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Report
          </Button>
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div className="flex flex-wrap gap-1.5 no-print">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Print area ── */}
      <div id="report-print-area" ref={printRef}>

        {/* Print header (only shows when printing) */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <h1 className="font-bold text-2xl">Lishe Pamoja — {TABS.find(t => t.id === tab)?.label} Report</h1>
          <p className="text-sm text-muted-foreground">Generated on {today}</p>
        </div>

        {/* ════════════════ OVERVIEW ════════════════ */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Users",        value: users.length,               color: "text-blue-700",   bg: "bg-blue-50 dark:bg-blue-950/30" },
                { label: "Total Listings",     value: listings.length,            color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/30" },
                { label: "Total Orders",       value: orders.length,              color: "text-purple-700", bg: "bg-purple-50 dark:bg-purple-950/30" },
                { label: "Platform Revenue",   value: fmt(totalRevenue),          color: "text-emerald-700",bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "Meals Rescued",      value: mealsSaved,                 color: "text-orange-700", bg: "bg-orange-50 dark:bg-orange-950/30" },
                { label: "CO₂ Reduced (kg)",  value: co2Reduced,                 color: "text-teal-700",   bg: "bg-teal-50 dark:bg-teal-950/30" },
                { label: "Completed Orders",   value: completedOrders.length,     color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/30" },
                { label: "Active Deliveries",  value: activeDispatches.length,    color: "text-amber-700",  bg: "bg-amber-50 dark:bg-amber-950/30" },
              ].map(k => (
                <Card key={k.label} className={`p-4 ${k.bg}`}>
                  <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            {/* Monthly orders area chart */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Monthly Transactions (last 6 months)</SectionTitle>
                <Button onClick={exportOrders} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              {monthlyOrders.every(m => m.orders === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyOrders}>
                    <defs>
                      <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gDeliveries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="orders" name="Total Orders" stroke="#22c55e" fill="url(#gOrders)" strokeWidth={2} />
                    <Area type="monotone" dataKey="deliveries" name="Delivery Orders" stroke="#3b82f6" fill="url(#gDeliveries)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Two charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionTitle>Listings by Category</SectionTitle>
                {categoryBreakdown.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis dataKey="name" type="category" fontSize={10} width={110} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0,4,4,0]} name="Count">
                        {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card className="p-5">
                <SectionTitle>Dispatch Status Distribution</SectionTitle>
                {dispatchPie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={dispatchPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {dispatchPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* Summary tables */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <SectionTitle>Platform Summary</SectionTitle>
                <StatRow label="Total Users" value={users.length} />
                <StatRow label="Active Subscribers" value={activeSubscribers.length} />
                <StatRow label="Total Listings" value={listings.length} />
                <StatRow label="Total Transactions" value={orders.length} />
                <StatRow label="Completed Orders" value={completedOrders.length} highlight />
                <StatRow label="Completion Rate" value={pct(completedOrders.length, orders.length)} />
                <StatRow label="Total Revenue" value={fmt(totalRevenue)} highlight />
              </Card>
              <Card className="p-4">
                <SectionTitle>Impact Metrics</SectionTitle>
                <StatRow label="Meals Rescued" value={mealsSaved} />
                <StatRow label="CO₂ Reduced (kg)" value={co2Reduced} />
                <StatRow label="Free Listings" value={freeListings.length} />
                <StatRow label="Paid Listings" value={paidListings.length} />
                <StatRow label="Delivery-Enabled" value={deliveryListings.length} />
                <StatRow label="Total Qty Available" value={totalQty} />
              </Card>
              <Card className="p-4">
                <SectionTitle>Logistics Summary</SectionTitle>
                <StatRow label="Total Dispatches" value={dispatches.length} />
                <StatRow label="Awaiting Rider" value={awaitingDispatches.length} />
                <StatRow label="Active" value={activeDispatches.length} />
                <StatRow label="Completed" value={completedDispatches.length} highlight />
                <StatRow label="Cancelled" value={cancelledDispatches.length} />
                <StatRow label="Fulfilment Rate" value={pct(completedDispatches.length, dispatches.length)} highlight />
              </Card>
            </div>
            <div className="flex justify-end no-print">
              <Button onClick={exportOverview} variant="outline" size="sm" className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export Overview CSV
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════ USERS ════════════════ */}
        {tab === "users" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Users",       value: users.length,               color: "text-blue-700" },
                { label: "Vendors",           value: vendors.length,             color: "text-green-700" },
                { label: "Riders",            value: riders.length,              color: "text-amber-700" },
                { label: "Active Subscribers",value: activeSubscribers.length,   color: "text-purple-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionTitle>User Role Breakdown</SectionTitle>
                {userRolePie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={userRolePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {userRolePie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-5">
                <SectionTitle>New User Registrations (last 6 months)</SectionTitle>
                {monthlyUsers.every(m => m.users === 0) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyUsers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="users" fill="#3b82f6" radius={[4,4,0,0]} name="New Users" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <SectionTitle>User Breakdown</SectionTitle>
                <StatRow label="Total Users" value={users.length} highlight />
                <StatRow label="Browse Only" value={browseOnly.length} />
                <StatRow label="Vendors (canSell)" value={vendors.length} />
                <StatRow label="Riders (canDeliver)" value={riders.length} />
                <StatRow label="Business (both)" value={business.length} />
                <StatRow label="Admins" value={admins.length} />
                <StatRow label="Suspended" value={suspended.length} />
              </Card>
              <Card className="p-4">
                <SectionTitle>Subscription & Wallet</SectionTitle>
                <StatRow label="Active Subscriptions" value={activeSubscribers.length} highlight />
                <StatRow label="Subscription Rate" value={pct(activeSubscribers.length, users.length)} />
                <StatRow label="Suspended Accounts" value={suspended.length} />
                <StatRow label="Total Wallet Balance" value={fmt(totalWalletBalance)} highlight />
                <StatRow label="Avg Wallet Balance" value={users.length ? fmt(totalWalletBalance / users.length) : "—"} />
              </Card>
            </div>

            {/* User table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">All Users</h3>
                <Button onClick={exportUsers} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Name","Email","Role","Subscription","Wallet (KES)","Joined"].map(h => (
                        <th key={h} className="text-left p-2.5 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 50).map(u => (
                      <tr key={u._id || u.id} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{u.name}</td>
                        <td className="p-2.5 text-muted-foreground">{u.email}</td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px]">
                            {u.isAdmin ? "Admin" : u.capabilities?.canSell && u.capabilities?.canDeliver ? "Business" : u.capabilities?.canSell ? "Vendor" : u.capabilities?.canDeliver ? "Rider" : "Browse"}
                          </Badge>
                        </td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${u.subscription?.status === "active" ? "bg-green-100 text-green-700" : u.subscription?.status === "suspended" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>
                            {u.subscription?.status || "none"}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium">{(u.walletBalance || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-KE") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length > 50 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 50 of {users.length} — export CSV for full list</p>}
              </div>
            </Card>
          </div>
        )}

        {/* ════════════════ REVENUE ════════════════ */}
        {tab === "revenue" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue",      value: fmt(totalRevenue),              color: "text-emerald-700" },
                { label: "Total Delivery Fees",value: fmt(totalDeliveryFees),         color: "text-blue-700" },
                { label: "Avg Order Value",    value: fmt(avgOrderValue),             color: "text-purple-700" },
                { label: "Purchase Orders",    value: purchaseOrders.length,          color: "text-amber-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Monthly Revenue (last 6 months)</SectionTitle>
                <Button onClick={exportOrders} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              {monthlyOrders.every(m => m.revenue === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyOrders}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `KES ${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" fill="url(#gRev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <SectionTitle>Revenue Breakdown</SectionTitle>
                <StatRow label="Total Gross Revenue" value={fmt(totalRevenue)} highlight />
                <StatRow label="From Delivery Fees" value={fmt(totalDeliveryFees)} />
                <StatRow label="From Product Sales" value={fmt(totalRevenue - totalDeliveryFees)} />
                <StatRow label="Platform Commission (10%)" value={fmt(totalRevenue * 0.1)} highlight />
                <StatRow label="Vendor Payouts (90%)" value={fmt((totalRevenue - totalDeliveryFees) * 0.9)} />
                <StatRow label="Rider Payouts (90% of fees)" value={fmt(totalDeliveryFees * 0.9)} />
              </Card>
              <Card className="p-4">
                <SectionTitle>Order Stats</SectionTitle>
                <StatRow label="Total Orders" value={orders.length} />
                <StatRow label="Purchase Orders" value={purchaseOrders.length} />
                <StatRow label="Free Claims" value={claimOrders.length} />
                <StatRow label="Delivery Orders" value={deliveryOrders.length} />
                <StatRow label="Pickup Orders" value={pickupOrders.length} />
                <StatRow label="Completed" value={completedOrders.length} highlight />
                <StatRow label="Cancelled" value={cancelledOrders.length} />
                <StatRow label="Completion Rate" value={pct(completedOrders.length, orders.length)} highlight />
              </Card>
            </div>

            {/* Transactions table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">All Transactions</h3>
                <Button onClick={exportOrders} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Listing","Type","Mode","Status","Base (KES)","Delivery (KES)","Total (KES)","Date"].map(h => (
                        <th key={h} className="text-left p-2.5 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0,50).map(o => (
                      <tr key={o.id} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-medium max-w-[140px] truncate">{o.listingTitle}</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{o.orderType}</Badge></td>
                        <td className="p-2.5 text-muted-foreground">{o.fulfillmentMode}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${o.status === "DELIVERED" ? "bg-green-100 text-green-700" : o.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-2.5">{(o.basePrice || 0).toLocaleString()}</td>
                        <td className="p-2.5">{(o.logisticsFee || 0).toLocaleString()}</td>
                        <td className="p-2.5 font-bold">{(o.totalPrice || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-muted-foreground">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-KE") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length > 50 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 50 of {orders.length} — export CSV for full list</p>}
              </div>
            </Card>
          </div>
        )}

        {/* ════════════════ LISTINGS ════════════════ */}
        {tab === "listings" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Listings",    value: listings.length,           color: "text-blue-700" },
                { label: "Available",         value: availableListings.length,  color: "text-green-700" },
                { label: "Fully Claimed",     value: claimedListings.length,    color: "text-purple-700" },
                { label: "Expired",           value: expiredListings.length,    color: "text-red-600" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionTitle>Listing Status Distribution</SectionTitle>
                {listingStatusPie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={listingStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                        label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {listingStatusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card className="p-5">
                <SectionTitle>Listings by Category</SectionTitle>
                {categoryBreakdown.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={categoryBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={11} />
                      <YAxis dataKey="name" type="category" fontSize={10} width={110} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0,4,4,0]} name="Listings">
                        {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            <Card className="p-5">
              <SectionTitle>New Listings per Month (last 6 months)</SectionTitle>
              {monthlyListings.every(m => m.listings === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyListings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="listings" fill="#22c55e" radius={[4,4,0,0]} name="New Listings" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <SectionTitle>Listing Stats</SectionTitle>
                <StatRow label="Total Listings" value={listings.length} highlight />
                <StatRow label="Available" value={availableListings.length} />
                <StatRow label="Partially Claimed" value={partialListings.length} />
                <StatRow label="Fully Claimed" value={claimedListings.length} />
                <StatRow label="Expired" value={expiredListings.length} />
                <StatRow label="Free Listings" value={freeListings.length} />
                <StatRow label="Paid Listings" value={paidListings.length} />
                <StatRow label="Delivery-Enabled" value={deliveryListings.length} />
                <StatRow label="Total Qty Available" value={totalQty} />
              </Card>
              {/* Category table */}
              <Card className="p-4">
                <SectionTitle>Category Breakdown</SectionTitle>
                {categoryBreakdown.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground text-xs">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs">{c.value}</span>
                      <span className="text-[10px] text-muted-foreground">{pct(c.value, listings.length)}</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Listings table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">All Listings</h3>
                <Button onClick={exportListings} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Title","Category","Vendor","Status","Price","Qty","Delivery","Expiry"].map(h => (
                        <th key={h} className="text-left p-2.5 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listings.slice(0,50).map(l => (
                      <tr key={l.id} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-medium max-w-[140px] truncate">{l.title}</td>
                        <td className="p-2.5 text-muted-foreground">{l.category || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{l.vendorName}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${l.status === "available" ? "bg-green-100 text-green-700" : l.status === "expired" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="p-2.5">{l.isFree ? <span className="text-green-600 font-semibold">Free</span> : `KES ${l.price}`}</td>
                        <td className="p-2.5">{l.quantity} {l.unit}</td>
                        <td className="p-2.5">{l.deliveryAllowed ? "✓" : "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{l.expiryDateTime ? new Date(l.expiryDateTime).toLocaleDateString("en-KE") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {listings.length > 50 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 50 of {listings.length} — export CSV for full list</p>}
              </div>
            </Card>
          </div>
        )}

        {/* ════════════════ LOGISTICS ════════════════ */}
        {tab === "logistics" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Dispatches",   value: dispatches.length,             color: "text-blue-700" },
                { label: "Completed",          value: completedDispatches.length,    color: "text-green-700" },
                { label: "Active",             value: activeDispatches.length,       color: "text-amber-700" },
                { label: "Fulfilment Rate",    value: pct(completedDispatches.length, dispatches.length), color: "text-purple-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionTitle>Dispatch Status</SectionTitle>
                {dispatchPie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={dispatchPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                        label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {dispatchPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card className="p-5">
                <SectionTitle>Delivery vs Pickup Orders</SectionTitle>
                {(deliveryOrders.length + pickupOrders.length) === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={[
                        { name: "Delivery", value: deliveryOrders.length, fill: "#3b82f6" },
                        { name: "Pickup",   value: pickupOrders.length,   fill: "#22c55e" },
                      ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        <Cell fill="#3b82f6" /><Cell fill="#22c55e" />
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <SectionTitle>Logistics Stats</SectionTitle>
                <StatRow label="Total Dispatches" value={dispatches.length} highlight />
                <StatRow label="Awaiting Rider" value={awaitingDispatches.length} />
                <StatRow label="Active (Assigned/In Transit)" value={activeDispatches.length} />
                <StatRow label="Completed" value={completedDispatches.length} highlight />
                <StatRow label="Cancelled" value={cancelledDispatches.length} />
                <StatRow label="Fulfilment Rate" value={pct(completedDispatches.length, dispatches.length)} highlight />
              </Card>
              <Card className="p-4">
                <SectionTitle>Revenue from Deliveries</SectionTitle>
                <StatRow label="Total Delivery Fee Collected" value={fmt(totalDeliveryFees)} highlight />
                <StatRow label="Platform Commission (10%)" value={fmt(totalDeliveryFees * 0.1)} />
                <StatRow label="Rider Payouts (90%)" value={fmt(totalDeliveryFees * 0.9)} highlight />
                <StatRow label="Avg Delivery Fee" value={deliveryOrders.length ? fmt(totalDeliveryFees / deliveryOrders.length) : "—"} />
                <StatRow label="Delivery Order Share" value={pct(deliveryOrders.length, orders.length)} />
              </Card>
            </div>

            {/* Dispatches table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Dispatch Records</h3>
                <Button onClick={exportLogistics} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {["Listing","Status","Delivery Fee","Rider Net (90%)","Platform (10%)","Settled","Date"].map(h => (
                        <th key={h} className="text-left p-2.5 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No dispatch records yet</td></tr>
                    ) : dispatches.slice(0,50).map((d: any) => (
                      <tr key={d._id} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-medium max-w-[140px] truncate">{d.listingId?.title || "—"}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${d.status === "DELIVERED" ? "bg-green-100 text-green-700" : d.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium">KES {(d.deliveryFee || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-green-700 font-bold">KES {(d.earnings?.riderNet || Math.round((d.deliveryFee||0)*0.9)).toLocaleString()}</td>
                        <td className="p-2.5 text-red-500">KES {(d.earnings?.platformFee || Math.round((d.deliveryFee||0)*0.1)).toLocaleString()}</td>
                        <td className="p-2.5">{d.earnings?.settled ? <span className="text-green-600 font-semibold">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                        <td className="p-2.5 text-muted-foreground">{d.timeline?.deliveredAt ? new Date(d.timeline.deliveredAt).toLocaleDateString("en-KE") : d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-KE") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dispatches.length > 50 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 50 — export CSV for full list</p>}
              </div>
            </Card>
          </div>
        )}

      </div>{/* end print area */}
    </div>
  );
}
