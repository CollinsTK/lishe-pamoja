import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Package, Leaf, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useData } from "@/contexts/DataContext";

type StatusFilter = "all" | "available" | "partially_claimed" | "claimed" | "expired";

const CATEGORY_EMOJI: Record<string, string> = {
  "Prepared Meals": "🍱", "Fresh Produce": "🥦", "Bakery": "🍞",
  "Dairy": "🥛", "Beverages": "☕", "Snacks": "🍿",
  "Grains": "🌾", "Other": "📦",
};

export default function AdminListings() {
  const { listings, fetchListings, isLoading } = useData();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => { fetchListings(); }, []);

  const categories = ["all", ...Array.from(new Set(listings.map(l => l.category))).sort()];

  const filtered = listings.filter((l) => {
    const q = search.toLowerCase();
    const matchQ = !q || l.title.toLowerCase().includes(q) || l.vendorName?.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchCat = categoryFilter === "all" || l.category === categoryFilter;
    return matchQ && matchStatus && matchCat;
  });

  const counts: Record<string, number> = {
    all:               listings.length,
    available:         listings.filter(l => l.status === "available").length,
    partially_claimed: listings.filter(l => l.status === "partially_claimed").length,
    claimed:           listings.filter(l => l.status === "claimed" || l.status === "fully_claimed").length,
    expired:           listings.filter(l => l.status === "expired").length,
  };

  const isExpiringSoon = (l: any) => {
    if (!l.expiryDateTime) return false;
    const diff = new Date(l.expiryDateTime).getTime() - Date.now();
    return diff > 0 && diff < 1000 * 60 * 60 * 6; // within 6 hours
  };

  const TABS: { id: StatusFilter; label: string }[] = [
    { id: "all",               label: `All (${counts.all})` },
    { id: "available",         label: `Available (${counts.available})` },
    { id: "partially_claimed", label: `Partial (${counts.partially_claimed})` },
    { id: "claimed",           label: `Claimed (${counts.claimed})` },
    { id: "expired",           label: `Expired (${counts.expired})` },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Listings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{listings.length} total listings across all vendors</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchListings} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setStatusFilter(id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              statusFilter === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by title, vendor or category…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-sm border border-input rounded-md px-3 bg-background text-foreground"
        >
          {categories.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 border-b border-border">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Listing</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Vendor</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Category</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Qty</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Price</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Expires</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Location</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">Loading listings…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">No listings found.</td></tr>
              ) : filtered.map((l) => (
                <tr key={l.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{CATEGORY_EMOJI[l.category] ?? "📦"}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate max-w-[160px]">{l.title}</p>
                        {l.isFree && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-green-700 font-semibold">
                            <Leaf className="w-2.5 h-2.5" /> Free
                          </span>
                        )}
                        {isExpiringSoon(l) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold ml-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Soon
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{l.vendorName ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">{l.category}</Badge>
                  </td>
                  <td className="p-3 text-xs hidden md:table-cell">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-muted-foreground" />
                      {l.quantity} {l.unit}
                    </span>
                  </td>
                  <td className="p-3 text-xs hidden md:table-cell">
                    {l.isFree ? <span className="text-green-700 font-semibold">Free</span> : `KES ${l.price}`}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="p-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                    {l.expiryDateTime
                      ? new Date(l.expiryDateTime).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="p-3 text-[11px] text-muted-foreground hidden lg:table-cell truncate max-w-[120px]">
                    {l.location?.address ? l.location.address.split(",")[0] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
