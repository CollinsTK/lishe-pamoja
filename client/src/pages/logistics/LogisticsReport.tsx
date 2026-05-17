import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Download, Printer, Truck, TrendingUp, CheckCircle, BarChart3 } from "lucide-react";
import Papa from "papaparse";

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

type Tab = "overview" | "dispatches" | "earnings";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Overview",   icon: BarChart3   },
  { id: "dispatches", label: "Dispatches", icon: Truck       },
  { id: "earnings",   label: "Earnings",   icon: TrendingUp  },
];

function StatRow({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-border/40 last:border-0 text-sm ${highlight ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-primary" : "font-semibold"}>{value}</span>
    </div>
  );
}

export default function LogisticsReport() {
  const { user } = useAuth();
  const { dispatches, orders } = useData();
  const [tab, setTab] = useState<Tab>("overview");
  const riderId = user?.id ?? "";
  const now = new Date();

  // ── Filter dispatches for this rider ──
  const myDispatches = dispatches.filter((d: any) =>
    d.logisticsId === riderId || d.logisticsId?._id === riderId
  );

  const completedDispatches = myDispatches.filter((d: any) =>
    d.status === "DELIVERED" || d.status === "Delivered"
  );
  const activeDispatches = myDispatches.filter((d: any) =>
    d.status === "ASSIGNED" || d.status === "IN_TRANSIT"
  );
  const awaitingDispatches = myDispatches.filter((d: any) =>
    d.status === "AWAITING_RIDER"
  );
  const cancelledDispatches = myDispatches.filter((d: any) =>
    d.status === "CANCELLED"
  );

  // ── Earnings ──
  const totalGross     = myDispatches.reduce((s: number, d: any) => s + (d.deliveryFee || 0), 0);
  const totalNet       = myDispatches.reduce((s: number, d: any) =>
    s + (d.earnings?.riderNet ?? Math.round((d.deliveryFee || 0) * 0.9)), 0
  );
  const totalPlatform  = myDispatches.reduce((s: number, d: any) =>
    s + (d.earnings?.platformFee ?? Math.round((d.deliveryFee || 0) * 0.1)), 0
  );
  const settledEarnings = completedDispatches.reduce((s: number, d: any) =>
    s + (d.earnings?.riderNet ?? Math.round((d.deliveryFee || 0) * 0.9)), 0
  );
  const pendingEarnings = activeDispatches.reduce((s: number, d: any) =>
    s + (d.earnings?.riderNet ?? Math.round((d.deliveryFee || 0) * 0.9)), 0
  );
  const avgFee = myDispatches.length ? totalGross / myDispatches.length : 0;

  // ── Monthly buckets ──
  const makeMonthly = <T extends Record<string, number>>(init: T) => {
    const buckets: Record<string, T & { month: string }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[`${d.getFullYear()}-${d.getMonth()}`] = { ...init, month: MONTH_LABELS[d.getMonth()] } as T & { month: string };
    }
    return buckets;
  };

  const dispatchBuckets = makeMonthly({ dispatches: 0, completed: 0, earnings: 0 });
  myDispatches.forEach((d: any) => {
    const date = d.createdAt || d.timeline?.acceptedAt;
    if (!date) return;
    const dt = new Date(date);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    if (dispatchBuckets[key]) {
      dispatchBuckets[key].dispatches++;
      if (d.status === "DELIVERED" || d.status === "Delivered") {
        dispatchBuckets[key].completed++;
        dispatchBuckets[key].earnings += d.earnings?.riderNet ?? Math.round((d.deliveryFee || 0) * 0.9);
      }
    }
  });
  const monthlyData = Object.values(dispatchBuckets);

  // ── Status pie ──
  const statusPie = [
    { name: "Completed",      value: completedDispatches.length, fill: "#22c55e" },
    { name: "Active",         value: activeDispatches.length,    fill: "#3b82f6" },
    { name: "Awaiting Rider", value: awaitingDispatches.length,  fill: "#f59e0b" },
    { name: "Cancelled",      value: cancelledDispatches.length, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── CSV ──
  const exportDispatches = () => csvDownload(
    myDispatches.map((d: any) => ({
      "Dispatch ID": d._id,
      Listing: d.listingId?.title || "—",
      Status: d.status,
      "Delivery Fee (KES)": d.deliveryFee || 0,
      "My Net (KES)": d.earnings?.riderNet ?? Math.round((d.deliveryFee || 0) * 0.9),
      "Platform Fee (KES)": d.earnings?.platformFee ?? Math.round((d.deliveryFee || 0) * 0.1),
      Settled: d.earnings?.settled ? "Yes" : "No",
      Date: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-KE") : "—",
    })),
    `logistics_report_${now.toISOString().split("T")[0]}.csv`
  );

  const EmptyChart = () => (
    <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">No data yet</div>
  );

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #rider-report-area, #rider-report-area * { visibility: visible; }
          #rider-report-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap gap-2 items-start justify-between no-print">
        <div>
          <h1 className="font-heading font-bold text-2xl">Logistics Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generated on {today} · {user?.name}</p>
        </div>
        <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
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

      <div id="rider-report-area">
        {/* Print header */}
        <div className="hidden print:block mb-6 border-b pb-3">
          <h1 className="font-bold text-xl">Lishe Pamoja — Rider {TABS.find(t => t.id === tab)?.label} Report</h1>
          <p className="text-sm text-muted-foreground">{user?.name} · {today}</p>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Dispatches",  value: myDispatches.length,         color: "text-blue-700" },
                { label: "Completed",         value: completedDispatches.length,  color: "text-green-700" },
                { label: "Fulfilment Rate",   value: pct(completedDispatches.length, myDispatches.length), color: "text-purple-700" },
                { label: "Total Earnings",    value: fmt(settledEarnings),        color: "text-emerald-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <h3 className="font-heading font-semibold text-sm mb-3">Monthly Dispatches & Earnings (last 6 months)</h3>
              {monthlyData.every(m => m.dispatches === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis yAxisId="left" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="completed" fill="#22c55e" radius={[4,4,0,0]} name="Completed" />
                    <Bar yAxisId="right" dataKey="earnings" fill="#3b82f6" radius={[4,4,0,0]} name="Earnings (KES)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Dispatch Summary</h3>
                <StatRow label="Total Dispatches" value={myDispatches.length} highlight />
                <StatRow label="Completed" value={completedDispatches.length} />
                <StatRow label="Active" value={activeDispatches.length} />
                <StatRow label="Awaiting" value={awaitingDispatches.length} />
                <StatRow label="Cancelled" value={cancelledDispatches.length} />
                <StatRow label="Fulfilment Rate" value={pct(completedDispatches.length, myDispatches.length)} highlight />
              </Card>
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Earnings Summary</h3>
                <StatRow label="Total Gross Fees" value={fmt(totalGross)} />
                <StatRow label="Your Net (90%)" value={fmt(totalNet)} highlight />
                <StatRow label="Platform Cut (10%)" value={fmt(totalPlatform)} />
                <StatRow label="Settled to Wallet" value={fmt(settledEarnings)} highlight />
                <StatRow label="Pending Earnings" value={fmt(pendingEarnings)} />
                <StatRow label="Avg Fee / Delivery" value={fmt(avgFee)} />
              </Card>
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Dispatch Status</h3>
                {statusPie.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No dispatch data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}
                        label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── DISPATCHES ── */}
        {tab === "dispatches" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total",        value: myDispatches.length,         color: "text-blue-700" },
                { label: "Completed",    value: completedDispatches.length,  color: "text-green-700" },
                { label: "Active",       value: activeDispatches.length,     color: "text-amber-700" },
                { label: "Cancelled",    value: cancelledDispatches.length,  color: "text-red-600" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Dispatch Status</h3>
                {statusPie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Monthly Completed Deliveries</h3>
                {monthlyData.every(m => m.completed === 0) ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="completed" fill="#22c55e" radius={[4,4,0,0]} name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* Dispatches table */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">All My Dispatches</h3>
                <Button onClick={exportDispatches} variant="outline" size="sm" className="gap-1 text-xs no-print">
                  <Download className="w-3 h-3" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>{["Listing","Status","Delivery Fee","My Net (90%)","Platform (10%)","Settled","Date"].map(h => (
                      <th key={h} className="text-left p-2.5 font-semibold text-muted-foreground">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {myDispatches.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No dispatches yet</td></tr>
                    ) : myDispatches.slice(0, 50).map((d: any) => (
                      <tr key={d._id} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-medium max-w-[140px] truncate">{d.listingId?.title || "—"}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${d.status === "DELIVERED" ? "bg-green-100 text-green-700" : d.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium">KES {(d.deliveryFee || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-green-700 font-bold">KES {(d.earnings?.riderNet ?? Math.round((d.deliveryFee||0)*0.9)).toLocaleString()}</td>
                        <td className="p-2.5 text-muted-foreground">KES {(d.earnings?.platformFee ?? Math.round((d.deliveryFee||0)*0.1)).toLocaleString()}</td>
                        <td className="p-2.5">{d.earnings?.settled ? <span className="text-green-600 font-semibold">✓ Yes</span> : <span className="text-muted-foreground">Pending</span>}</td>
                        <td className="p-2.5 text-muted-foreground">{d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-KE") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {myDispatches.length > 50 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 50 — export CSV for full list</p>}
              </div>
            </Card>
          </div>
        )}

        {/* ── EARNINGS ── */}
        {tab === "earnings" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Gross Fees",    value: fmt(totalGross),        color: "text-blue-700" },
                { label: "Your Net (90%)",       value: fmt(totalNet),          color: "text-emerald-700" },
                { label: "Settled to Wallet",    value: fmt(settledEarnings),   color: "text-green-700" },
                { label: "Pending Earnings",     value: fmt(pendingEarnings),   color: "text-amber-700" },
              ].map(k => (
                <Card key={k.label} className="p-4 text-center">
                  <p className={`font-heading font-bold text-xl ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <h3 className="font-heading font-semibold text-sm mb-3">Monthly Earnings Trend (last 6 months)</h3>
              {monthlyData.every(m => m.earnings === 0) ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gRiderEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Earnings"]} />
                    <Area type="monotone" dataKey="earnings" stroke="#22c55e" fill="url(#gRiderEarnings)" strokeWidth={2} name="Earnings" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Earnings Breakdown</h3>
                <StatRow label="Total Delivery Fees Earned" value={fmt(totalGross)} />
                <StatRow label="Your Net (90%)" value={fmt(totalNet)} highlight />
                <StatRow label="Platform Commission (10%)" value={fmt(totalPlatform)} />
                <StatRow label="Settled to Wallet" value={fmt(settledEarnings)} highlight />
                <StatRow label="Pending (active deliveries)" value={fmt(pendingEarnings)} />
                <StatRow label="Avg Fee per Delivery" value={fmt(avgFee)} />
              </Card>
              <Card className="p-4">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">Performance</h3>
                <StatRow label="Total Dispatches" value={myDispatches.length} />
                <StatRow label="Completed Deliveries" value={completedDispatches.length} highlight />
                <StatRow label="Fulfilment Rate" value={pct(completedDispatches.length, myDispatches.length)} highlight />
                <StatRow label="Active Deliveries" value={activeDispatches.length} />
                <StatRow label="Cancelled" value={cancelledDispatches.length} />
              </Card>
            </div>

            <div className="flex justify-end no-print">
              <Button onClick={exportDispatches} variant="outline" size="sm" className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
