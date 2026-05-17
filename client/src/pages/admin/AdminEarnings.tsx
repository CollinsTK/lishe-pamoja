import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import {
  RefreshCw, TrendingUp, DollarSign, Truck, Store, BadgePercent, CreditCard,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface EarningSummary {
  totalPlatformFee: number;
  totalVendorGross: number;
  totalVendorNet: number;
  totalRiderGross: number;
  totalRiderNet: number;
  subscriptionEarnings: number;
  totalRevenue: number;
}

interface VendorRow  { id: string; name: string; email: string; gross: number; net: number; platformFee: number; orders: number; }
interface RiderRow   { id: string; name: string; email: string; gross: number; net: number; platformFee: number; deliveries: number; }
interface SubPlanRow { plan: string; count: number; total: number; }

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const pct = (part: number, total: number) => total ? `${((part / total) * 100).toFixed(1)}%` : "—";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];

export default function AdminEarnings() {
  const [summary, setSummary] = useState<EarningSummary | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [riders,  setRiders]  = useState<RiderRow[]>([]);
  const [subPlans, setSubPlans] = useState<SubPlanRow[]>([]);
  const [txCount, setTxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"vendors" | "riders" | "subscriptions">("vendors");

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await apiClient.get("/transactions/admin/earnings");
      setSummary(data.summary);
      setVendors(data.vendors ?? []);
      setRiders(data.riders ?? []);
      setSubPlans(data.subscriptionBreakdown ?? []);
      setTxCount(data.transactionCount ?? 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const s = summary!;
  const totalGross = (s?.totalVendorGross ?? 0) + (s?.totalRiderGross ?? 0);

  const kpis = [
    { label: "Total Platform Revenue",  value: fmt(s.totalRevenue),        icon: DollarSign,    cls: "text-primary" },
    { label: "Transaction Commissions", value: fmt(s.totalPlatformFee),     icon: BadgePercent,  cls: "text-indigo-600" },
    { label: "Subscription Earnings",   value: fmt(s.subscriptionEarnings), icon: CreditCard,    cls: "text-emerald-600" },
    { label: "Vendor Gross Sales",       value: fmt(s.totalVendorGross),     icon: Store,         cls: "text-amber-600" },
    { label: "Rider Gross Earnings",     value: fmt(s.totalRiderGross),      icon: Truck,         cls: "text-blue-600" },
    { label: "Transactions Tracked",     value: txCount.toString(),          icon: TrendingUp,    cls: "text-muted-foreground" },
  ];

  const pieData = [
    { name: "Vendor Commission (10%)", value: Math.round(s.totalVendorGross * 0.1) },
    { name: "Rider Commission (10%)",  value: Math.round(s.totalRiderGross  * 0.1) },
    { name: "Subscriptions",           value: s.subscriptionEarnings },
  ].filter(d => d.value > 0);

  const subPieData = subPlans.map((p, i) => ({ name: p.plan, value: p.total }));

  const barData = [
    { label: "Vendor Gross",  gross: s.totalVendorGross, net: s.totalVendorNet },
    { label: "Rider Gross",   gross: s.totalRiderGross,  net: s.totalRiderNet  },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Platform Earnings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            10% commission on all sales &amp; deliveries · subscription revenue
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map(({ label, value, icon: Icon, cls }) => (
          <Card key={label} className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted shrink-0">
              <Icon className={`w-4 h-4 ${cls}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-heading font-bold text-lg truncate ${cls}`}>{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar: gross vs net */}
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Gross vs Net (Platform keeps the gap)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="gross" name="Gross" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net"   name="Net to Earner" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie: revenue sources */}
        {pieData.length > 0 && (
          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Revenue Sources</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Commission summary strip */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Vendor commission rate</p>
            <p className="font-bold text-lg">10%</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(Math.round(s.totalVendorGross * 0.1))} earned</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rider commission rate</p>
            <p className="font-bold text-lg">10%</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(Math.round(s.totalRiderGross * 0.1))} earned</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vendor share of sales</p>
            <p className="font-bold text-lg">{pct(s.totalVendorNet, s.totalVendorGross)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(s.totalVendorNet)} to vendors</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rider share of delivery</p>
            <p className="font-bold text-lg">{pct(s.totalRiderNet, s.totalRiderGross)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(s.totalRiderNet)} to riders</p>
          </div>
        </div>
      </Card>

      {/* Tabs: vendors / riders / subscriptions */}
      <div>
        <div className="flex gap-2 mb-3">
          {(["vendors", "riders", "subscriptions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {t === "vendors" ? `Vendors (${vendors.length})` : t === "riders" ? `Riders (${riders.length})` : `Subscriptions (${subPlans.length} plans)`}
            </button>
          ))}
        </div>

        {tab === "vendors" && (
          <div className="space-y-2">
            {vendors.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-sm">No vendor data yet</Card>
            ) : vendors.map((v) => (
              <Card key={v.id} className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{v.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{v.email}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-bold">{fmt(v.gross)}</p>
                  <p className="text-[11px] text-muted-foreground">gross · {v.orders} orders</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-semibold text-emerald-600">{fmt(v.net)}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {fmt(Math.round(v.gross * 0.1))} commission
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "riders" && (
          <div className="space-y-2">
            {riders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-sm">No rider data yet</Card>
            ) : riders.map((r) => (
              <Card key={r.id} className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-bold">{fmt(r.gross)}</p>
                  <p className="text-[11px] text-muted-foreground">gross · {r.deliveries} deliveries</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-semibold text-blue-600">{fmt(r.net)}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {fmt(Math.round(r.gross * 0.1))} commission
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "subscriptions" && (
          <div className="space-y-3">
            {/* Total + pie */}
            <Card className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total subscription revenue</p>
                    <p className="font-heading font-bold text-2xl text-emerald-600">{fmt(s.subscriptionEarnings)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">By plan</p>
                    {subPlans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subscription payments recorded yet</p>
                    ) : subPlans.map((p) => (
                      <div key={p.plan} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                        <div>
                          <span className="font-medium">{p.plan}</span>
                          <span className="text-muted-foreground text-xs ml-2">{p.count} {p.count === 1 ? "purchase" : "purchases"}</span>
                        </div>
                        <span className="font-bold text-emerald-700">{fmt(p.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {subPieData.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={subPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {subPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
