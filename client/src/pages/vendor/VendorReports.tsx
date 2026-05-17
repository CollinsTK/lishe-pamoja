import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Download, Printer, Package, ShoppingBag, TrendingUp, BarChart3 } from "lucide-react";
import Papa from "papaparse";

const COLORS = ["#22c55e","#f59e0b","#3b82f6","#ef4444","#8b5cf6","#06b6d4"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const today = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const pct = (a: number, b: number) => b === 0 ? "—" : `${Math.round((a / b) * 100)}%`;

function csvDownload(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.setAttribute("download", filename);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

type Tab = "overview" | "listings" | "orders" | "revenue";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview",  icon: BarChart3   },
  { id: "listings", label: "Listings",  icon: Package     },
  { id: "orders",   label: "Orders",    icon: ShoppingBag },
  { id: "revenue",  label: "Revenue",   icon: TrendingUp  },
];

function StatRow({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-border/40 last:border-0 text-sm ${highlight ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-primary" : "font-semibold"}>{value}</span>
    </div>
  );
}

export default function VendorReports() {
  const { user } = useAuth();
  const { listings, orders } = useData();
  const [tab, setTab] = useState<Tab>("overview");
  const vendorId = user?.id ?? "";
  const now = new Date();

  const vendorListings = listings.filter(l => l.vendorId === vendorId);
  const vendorOrders   = orders.filter(o => o.vendorId === vendorId);

  // ── Listing metrics ──
  const availableListings  = vendorListings.filter(l => l.status === "available");
  const partialListings    = vendorListings.filter(l => l.status === "partially_claimed");
  const claimedListings    = vendorListings.filter(l => l.status === "fully_claimed");
  const expiredListings    = vendorListings.filter(l => l.status === "expired");
  const freeListings       = vendorListings.filter(l => l.isFree);
  const deliveryListings   = vendorListings.filter(l => l.deliveryAllowed);
  const totalQty           = vendorListings.reduce((s, l) => s + (l.quantity || 0), 0);

  // ── Order metrics ──
  const completedOrders  = vendorOrders.filter(o => o.status === "DELIVERED" || o.status === "COMPLETED" || o.status === "Completed");
  const pendingOrders    = vendorOrders.filter(o => o.status === "CLAIMED" || o.status === "Pending" || o.status === "AWAITING_RIDER");
  const cancelledOrders  = vendorOrders.filter(o => o.status === "CANCELLED");
  const deliveryOrders   = vendorOrders.filter(o => o.fulfillmentMode === "Delivery");
  const pickupOrders     = vendorOrders.filter(o => o.fulfillmentMode === "Pickup");
  const claimOrders      = vendorOrders.filter(o => o.orderType === "Claim");
  const purchaseOrders   = vendorOrders.filter(o => o.orderType === "Purchase");

  // ── Revenue ──
  const totalRevenue     = vendorOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const productRevenue   = vendorOrders.reduce((s, o) => s + (o.basePrice || 0), 0);
  const deliveryRevenue  = vendorOrders.reduce((s, o) => s + (o.logisticsFee || 0), 0);
  const vendorNet        = Math.round(productRevenue * 0.9);
  const platformFee      = Math.round(productRevenue * 0.1);
  const avgOrderValue    = purchaseOrders.length ? totalRevenue / purchaseOrders.length : 0;

  // ── Monthly buckets ──
  const makeMonthly = <T extends Record<string, number>>(init: T) => {
    const buckets: Record<string, T & { month: string }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[`${d.getFullYear()}-${d.getMonth()}`] = { ...init, month: MONTH_LABELS[d.getMonth()] } as T & { month: string };
    }
    return buckets;
  };

  const orderBuckets = makeMonthly({ orders: 0, revenue: 0, deliveries: 0 });
  vendorOrders.forEach(o => {
    if (!o.createdAt) return;
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (orderBuckets[key]) {
      orderBuckets[key].orders++;
      orderBuckets[key].revenue += o.totalPrice || 0;
      if (o.fulfillmentMode === "Delivery") orderBuckets[key].deliveries++;
    }
  });
  const monthlyOrders = Object.values(orderBuckets);

  const listingBuckets = makeMonthly({ listed: 0, expired: 0 });
  vendorListings.forEach(l => {
    if (!l.createdAt) return;
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (listingBuckets[key]) {
      listingBuckets[key].listed++;
      if (l.status === "expired") listingBuckets[key].expired++;
    }
  });
  const monthlyListings = Object.values(listingBuckets);

  // ── Category breakdown ──
  const categoryBreakdown = Object.entries(
    vendorListings.reduce((acc: Record<string, number>, l) => {
      const c = l.category || "Uncategorised";
      acc[c] = (acc[c] || 0) + 1; return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // ── Status pie ──
  const listingStatusPie = [
    { name: "Available",     value: availableListings.length, fill: "#22c55e" },
    { name: "Partial",       value: partialListings.length,   fill: "#f59e0b" },
    { name: "Fully Claimed", value: claimedListings.length,   fill: "#3b82f6" },
    { name: "Expired",       value: expiredListings.length,   fill: "#ef4444" },
  ].filter(d => d.value > 0);

  const fulfillmentPie = [
    { name: "Completed", value: completedOrders.length, fill: "#22c55e" },
    { name: "Pending",   value: pendingOrders.length,   fill: "#f59e0b" },
    { name: "Cancelled", value: cancelledOrders.length, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── CSV exports ──
  const exportOrders = () => csvDownload(
    vendorOrders.map(o => ({
      "Order ID": o.id,
      Date: o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-KE") : "",
      Listing: o.listingTitle, Qty: `${o.orderedQuantity} ${o.unit}`,
      Type: o.orderType, Mode: o.fulfillmentMode, Status: o.status,
      "Base (KES)": o.basePrice, "Delivery (KES)": o.logisticsFee, "Total (KES)": o.totalPrice,
    })),
    `vendor_orders_${now.toISOString().split("T")[0]}.csv`
  );

  const exportListings = () => csvDownload(
    vendorListings.map(l => ({
      Title: l.title, Category: l.category, Status: l.status,
      Free: l.isFree ? "Yes" : "No", "Price (KES)": l.price,
      "Available Qty": l.quantity, Unit: l.unit,
      "Delivery Allowed": l.deliveryAllowed ? "Yes" : "No",
      Expiry: l.expiryDateTime ? new Date(l.expiryDateTime).toLocaleDateString("en-KE") : "",
    })),
    `vendor_listings_${now.toISOString().split("T")[0]}.csv`
  );

  const EmptyChart = () => (
    <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">No data yet</div>
  );

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #vendor-report-area, #vendor-report-area * { visibility: visible; }
          #vendor-report-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap gap-2 items-start justify-between no-print">
        <div>
          <h1 className="font-heading font-bold text-2xl">Sales Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generated on {today} · {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Tab nav */}
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

      <div id="vendor-report-area">
        {/* Print header */}
        <div className="hidden print:block mb-6 border-b pb-3">
          <h1 className="font-bold text-xl">Lishe Pamoja — Vendor {TABS.find(t => t.id === tab)?.label} Report</h1>
          <p className="text-sm text-muted-foreground">{user?.name} · {today}</p>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Listings",    value: vendorListings.length,      color: "text-blue-700" },
                { label: "Total Orders",      value: vendorOrders.length,        color: "text-purple-700" },
                { label: "Total Revenue",     value: fmt(totalRevenue),          color: "text-emerald-700" },
                { label: "Fulfilment Rate",   value: pct(completedOrders.length, vendorOrders.length), color: "text-green-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <h3 className="font-heading font-semibold text-sm mb-3">Monthly Orders & Revenue (last 6 months)</h3>
              {monthlyOrders.every(m => m.orders === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyOrders}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis yAxisId="left" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" radius={[4,4,0,0]} name="Orders" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#22c55e" radius={[4,4,0,0]} name="Revenue (KES)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Listing Summary</h3>
                <StatRow label="Total Listings" value={vendorListings.length} highlight />
                <StatRow label="Available" value={availableListings.length} />
                <StatRow label="Fully Claimed" value={claimedListings.length} />
                <StatRow label="Expired" value={expiredListings.length} />
                <StatRow label="Free Listings" value={freeListings.length} />
              </Card>
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Order Summary</h3>
                <StatRow label="Total Orders" value={vendorOrders.length} highlight />
                <StatRow label="Completed" value={completedOrders.length} />
                <StatRow label="Pending" value={pendingOrders.length} />
                <StatRow label="Cancelled" value={cancelledOrders.length} />
                <StatRow label="Fulfilment Rate" value={pct(completedOrders.length, vendorOrders.length)} highlight />
              </Card>
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Revenue Summary</h3>
                <StatRow label="Total Revenue" value={fmt(totalRevenue)} highlight />
                <StatRow label="Your Net (90%)" value={fmt(vendorNet)} />
                <StatRow label="Platform Fee (10%)" value={fmt(platformFee)} />
                <StatRow label="Avg Order Value" value={fmt(avgOrderValue)} />
              </Card>
            </div>
          </div>
        )}

        {/* ── LISTINGS ── */}
        {tab === "listings" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total",        value: vendorListings.length,      color: "text-blue-700" },
                { label: "Available",    value: availableListings.length,   color: "text-green-700" },
                { label: "Expired",      value: expiredListings.length,     color: "text-red-600" },
                { label: "Free",         value: freeListings.length,        color: "text-amber-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Listing Status</h3>
                {listingStatusPie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={listingStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {listingStatusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Listings by Category</h3>
                {categoryBreakdown.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
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
              <h3 className="font-heading font-semibold text-sm mb-3">Monthly Listings Activity (last 6 months)</h3>
              {monthlyListings.every(m => m.listed === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyListings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip /><Legend />
                    <Bar dataKey="listed" fill="#22c55e" radius={[4,4,0,0]} name="Listed" />
                    <Bar dataKey="expired" fill="#ef4444" radius={[4,4,0,0]} name="Expired" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Listings table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">All My Listings</h3>
                <Button onClick={exportListings} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>{["Title","Category","Status","Price","Qty","Delivery","Expiry"].map(h => (
                      <th key={h} className="text-left p-2.5 font-semibold text-muted-foreground">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {vendorListings.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No listings yet</td></tr>
                    ) : vendorListings.map(l => (
                      <tr key={l.id} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-medium max-w-[140px] truncate">{l.title}</td>
                        <td className="p-2.5 text-muted-foreground">{l.category}</td>
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
              </div>
            </Card>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Orders",    value: vendorOrders.length,         color: "text-blue-700" },
                { label: "Completed",       value: completedOrders.length,      color: "text-green-700" },
                { label: "Pending",         value: pendingOrders.length,        color: "text-amber-700" },
                { label: "Cancelled",       value: cancelledOrders.length,      color: "text-red-600" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Order Status</h3>
                {fulfillmentPie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={fulfillmentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {fulfillmentPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Delivery vs Pickup</h3>
                {(deliveryOrders.length + pickupOrders.length) === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={[
                        { name: "Delivery", value: deliveryOrders.length, fill: "#3b82f6" },
                        { name: "Pickup",   value: pickupOrders.length,   fill: "#22c55e" },
                      ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
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
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Order Breakdown</h3>
                <StatRow label="Total Orders" value={vendorOrders.length} highlight />
                <StatRow label="Purchase Orders" value={purchaseOrders.length} />
                <StatRow label="Free Claims" value={claimOrders.length} />
                <StatRow label="Delivery Orders" value={deliveryOrders.length} />
                <StatRow label="Pickup Orders" value={pickupOrders.length} />
                <StatRow label="Completed" value={completedOrders.length} highlight />
                <StatRow label="Fulfilment Rate" value={pct(completedOrders.length, vendorOrders.length)} highlight />
              </Card>
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Monthly Orders</h3>
                {monthlyOrders.every(m => m.orders === 0) ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No order data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={monthlyOrders}>
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#3b82f6" radius={[3,3,0,0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* Orders table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">All Orders</h3>
                <Button onClick={exportOrders} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>{["Listing","Type","Mode","Status","Base (KES)","Delivery (KES)","Total (KES)","Date"].map(h => (
                      <th key={h} className="text-left p-2.5 font-semibold text-muted-foreground">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {vendorOrders.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No orders yet</td></tr>
                    ) : vendorOrders.slice(0, 50).map(o => (
                      <tr key={o.id} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-medium max-w-[140px] truncate">{o.listingTitle}</td>
                        <td className="p-2.5 text-muted-foreground">{o.orderType}</td>
                        <td className="p-2.5 text-muted-foreground">{o.fulfillmentMode}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${o.status === "DELIVERED" || o.status === "Completed" ? "bg-green-100 text-green-700" : o.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-2.5">{(o.basePrice||0).toLocaleString()}</td>
                        <td className="p-2.5">{(o.logisticsFee||0).toLocaleString()}</td>
                        <td className="p-2.5 font-bold">{(o.totalPrice||0).toLocaleString()}</td>
                        <td className="p-2.5 text-muted-foreground">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-KE") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vendorOrders.length > 50 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 50 — export CSV for full list</p>}
              </div>
            </Card>
          </div>
        )}

        {/* ── REVENUE ── */}
        {tab === "revenue" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue",   value: fmt(totalRevenue),    color: "text-emerald-700" },
                { label: "Your Net (90%)",  value: fmt(vendorNet),       color: "text-green-700" },
                { label: "Platform (10%)",  value: fmt(platformFee),     color: "text-red-500" },
                { label: "Avg Order Value", value: fmt(avgOrderValue),   color: "text-purple-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <h3 className="font-heading font-semibold text-sm mb-3">Monthly Revenue Trend (last 6 months)</h3>
              {monthlyOrders.every(m => m.revenue === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyOrders}>
                    <defs>
                      <linearGradient id="gVendorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#gVendorRev)" strokeWidth={2} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Revenue Breakdown</h3>
                <StatRow label="Total Gross Revenue" value={fmt(totalRevenue)} highlight />
                <StatRow label="Product Sales Revenue" value={fmt(productRevenue)} />
                <StatRow label="Delivery Fees Collected" value={fmt(deliveryRevenue)} />
                <StatRow label="Your Net Earnings (90%)" value={fmt(vendorNet)} highlight />
                <StatRow label="Platform Commission (10%)" value={fmt(platformFee)} />
                <StatRow label="Avg Order Value" value={fmt(avgOrderValue)} />
              </Card>
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Sales Stats</h3>
                <StatRow label="Purchase Orders" value={purchaseOrders.length} />
                <StatRow label="Free Claims" value={claimOrders.length} />
                <StatRow label="Paid Orders" value={purchaseOrders.length} highlight />
                <StatRow label="Delivery Orders" value={deliveryOrders.length} />
                <StatRow label="Pickup Orders" value={pickupOrders.length} />
                <StatRow label="Completion Rate" value={pct(completedOrders.length, vendorOrders.length)} highlight />
              </Card>
            </div>

            <div className="flex justify-end no-print">
              <Button onClick={exportOrders} variant="outline" size="sm" className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export Orders CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
