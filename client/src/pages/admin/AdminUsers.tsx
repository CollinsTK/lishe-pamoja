import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, UserCheck, UserX, Trash2, RefreshCw,
  Store, Truck, ShieldCheck, Users, Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

type RoleFilter = "all" | "canSell" | "canDeliver" | "admin" | "basic";

const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;

function capBadges(u: any) {
  const badges = [];
  if (u.isAdmin) badges.push(<span key="admin" className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 font-semibold">Admin</span>);
  if (u.capabilities?.canSell) badges.push(<span key="sell" className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-semibold flex items-center gap-0.5"><Store className="w-2.5 h-2.5"/>Sell</span>);
  if (u.capabilities?.canDeliver) badges.push(<span key="deliver" className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 font-semibold flex items-center gap-0.5"><Truck className="w-2.5 h-2.5"/>Deliver</span>);
  if (badges.length === 0) badges.push(<span key="basic" className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Browse only</span>);
  return badges;
}

export default function AdminUsers() {
  const { users, verifyUser, updateUser, deleteUser, fetchUsers, isLoading } = useData();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
    let matchRole = true;
    if (roleFilter === "canSell")    matchRole = !!u.capabilities?.canSell;
    if (roleFilter === "canDeliver") matchRole = !!u.capabilities?.canDeliver;
    if (roleFilter === "admin")      matchRole = !!u.isAdmin;
    if (roleFilter === "basic")      matchRole = !u.capabilities?.canSell && !u.capabilities?.canDeliver && !u.isAdmin;
    return matchQ && matchRole;
  });

  const counts = {
    all:        users.length,
    canSell:    users.filter(u => u.capabilities?.canSell).length,
    canDeliver: users.filter(u => u.capabilities?.canDeliver).length,
    admin:      users.filter(u => u.isAdmin).length,
    basic:      users.filter(u => !u.capabilities?.canSell && !u.capabilities?.canDeliver && !u.isAdmin).length,
  };

  const isSuspended = (u: any) => u.subscription?.status === "suspended";

  const handle = async (fn: () => Promise<void>, uid: string, msg: string, errMsg: string) => {
    setBusy(uid);
    try { await fn(); toast.success(msg); }
    catch { toast.error(errMsg); }
    finally { setBusy(null); }
  };

  const TAB_FILTERS: { id: RoleFilter; label: string; icon?: any }[] = [
    { id: "all",        label: `All (${counts.all})` },
    { id: "canSell",    label: `Vendors (${counts.canSell})`,   icon: Store },
    { id: "canDeliver", label: `Riders (${counts.canDeliver})`, icon: Truck },
    { id: "admin",      label: `Admins (${counts.admin})`,      icon: ShieldCheck },
    { id: "basic",      label: `Browse-only (${counts.basic})`, icon: Users },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} registered users</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TAB_FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setRoleFilter(id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              roleFilter === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {Icon && <Icon className="w-3 h-3" />} {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 border-b border-border">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">User</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Phone</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Capabilities</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Subscription</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Wallet</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Joined</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">Loading users…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No users found.</td></tr>
              ) : filtered.map((u) => {
                const suspended = isSuspended(u);
                const uid = u.id || u._id;
                const loading = busy === uid;
                return (
                  <tr key={uid} className={`border-t hover:bg-muted/20 ${suspended ? "opacity-60" : ""}`}>
                    {/* Name + email */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-sm">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{u.phone || "—"}</td>
                    {/* Capabilities */}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">{capBadges(u)}</div>
                    </td>
                    {/* Subscription */}
                    <td className="p-3 hidden md:table-cell">
                      <div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          suspended ? "bg-destructive/10 text-destructive" :
                          u.subscription?.status === "active" ? "bg-green-500/10 text-green-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {suspended ? "Suspended" : u.subscription?.status ?? "free"}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[100px]">{u.subscription?.plan ?? "free"}</p>
                      </div>
                    </td>
                    {/* Wallet */}
                    <td className="p-3 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-xs font-semibold">
                        <Wallet className="w-3 h-3 text-muted-foreground" />
                        {fmt(u.walletBalance)}
                      </span>
                    </td>
                    {/* Joined */}
                    <td className="p-3 text-[11px] text-muted-foreground hidden lg:table-cell">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {/* Grant sell+deliver (if neither capability set) */}
                        {!u.capabilities?.canSell && !u.capabilities?.canDeliver && !u.isAdmin && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 px-2"
                            disabled={loading}
                            title="Grant Vendor + Rider capabilities"
                            onClick={() => handle(() => verifyUser(uid), uid, `${u.name} granted Sell & Deliver`, "Failed to update")}
                          >
                            <UserCheck className="w-3 h-3 mr-1 text-green-600" />
                            <span className="hidden sm:inline">Activate</span>
                          </Button>
                        )}
                        {/* Grant only canSell */}
                        {!u.capabilities?.canSell && (u.capabilities?.canDeliver || u.isAdmin ? false : false) && (
                          null
                        )}
                        {/* Toggle sell */}
                        {(u.capabilities?.canSell || u.capabilities?.canDeliver) && (
                          <Button
                            size="sm" variant="ghost"
                            className="text-xs h-7 px-2 text-muted-foreground"
                            disabled={loading}
                            title={u.capabilities?.canSell ? "Remove Sell capability" : "Grant Sell capability"}
                            onClick={() => handle(
                              () => updateUser(uid, { capabilities: { canSell: !u.capabilities?.canSell, canDeliver: u.capabilities?.canDeliver } }),
                              uid,
                              u.capabilities?.canSell ? `Sell removed for ${u.name}` : `Sell granted to ${u.name}`,
                              "Failed to update"
                            )}
                          >
                            <Store className={`w-3 h-3 ${u.capabilities?.canSell ? "text-amber-600" : "text-muted-foreground"}`} />
                          </Button>
                        )}
                        {/* Toggle deliver */}
                        {(u.capabilities?.canSell || u.capabilities?.canDeliver) && (
                          <Button
                            size="sm" variant="ghost"
                            className="text-xs h-7 px-2"
                            disabled={loading}
                            title={u.capabilities?.canDeliver ? "Remove Deliver capability" : "Grant Deliver capability"}
                            onClick={() => handle(
                              () => updateUser(uid, { capabilities: { canSell: u.capabilities?.canSell, canDeliver: !u.capabilities?.canDeliver } }),
                              uid,
                              u.capabilities?.canDeliver ? `Deliver removed for ${u.name}` : `Deliver granted to ${u.name}`,
                              "Failed to update"
                            )}
                          >
                            <Truck className={`w-3 h-3 ${u.capabilities?.canDeliver ? "text-blue-600" : "text-muted-foreground"}`} />
                          </Button>
                        )}
                        {/* Suspend / Activate */}
                        {!u.isAdmin && (
                          suspended ? (
                            <Button
                              size="sm" variant="ghost"
                              className="text-xs h-7 px-2 text-green-600"
                              disabled={loading}
                              title="Reactivate user"
                              onClick={() => handle(() => updateUser(uid, { status: "Active" }), uid, `${u.name} reactivated`, "Failed")}
                            >
                              <UserCheck className="w-3 h-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="ghost"
                              className="text-xs h-7 px-2 text-destructive"
                              disabled={loading}
                              title="Suspend user"
                              onClick={() => handle(() => updateUser(uid, { status: "Suspended" }), uid, `${u.name} suspended`, "Failed")}
                            >
                              <UserX className="w-3 h-3" />
                            </Button>
                          )
                        )}
                        {/* Delete */}
                        {!u.isAdmin && (
                          <Button
                            size="sm" variant="ghost"
                            className="text-xs h-7 px-2 text-destructive/60 hover:text-destructive"
                            disabled={loading}
                            title="Delete user"
                            onClick={() => {
                              if (confirm(`Delete "${u.name}"? This cannot be undone.`)) {
                                handle(() => deleteUser(uid), uid, `${u.name} deleted`, "Failed to delete");
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
