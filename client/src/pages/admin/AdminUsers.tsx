import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

export default function AdminUsers() {
  const { users, verifyUser, updateUser } = useData();
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleVerify = (userId: string, userName: string) => {
    verifyUser(userId);
    toast.success(`User "${userName}" has been verified`);
  };

  const handleSuspend = (userId: string, userName: string) => {
    updateUser(userId, { status: "Suspended" });
    toast.warning(`User "${userName}" has been suspended`);
  };

  const handleActivate = (userId: string, userName: string) => {
    updateUser(userId, { status: "Active" });
    toast.success(`User "${userName}" has been activated`);
  };

  const roleCounts = {
    recipient: users.filter(u => u.role === "recipient").length,
    vendor: users.filter(u => u.role === "vendor").length,
    logistics: users.filter(u => u.role === "logistics").length,
    admin: users.filter(u => u.role === "admin").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">User Management</h1>
        <Badge variant="outline">{users.length} users</Badge>
      </div>

      {/* Role summary */}
      <div className="flex gap-2">
        <Badge variant="outline" className="bg-primary/5 text-primary">Recipients: {roleCounts.recipient}</Badge>
        <Badge variant="outline" className="bg-secondary/5 text-secondary">Vendors: {roleCounts.vendor}</Badge>
        <Badge variant="outline" className="bg-accent/5 text-accent">Logistics: {roleCounts.logistics}</Badge>
        <Badge variant="outline">Admins: {roleCounts.admin}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Verified</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.status === "Active" ? "bg-success/10 text-success" : 
                        u.status === "Suspended" ? "bg-destructive/10 text-destructive" : 
                        "bg-warning/10 text-warning"
                      }`}>
                        {u.status || "Active"}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.role === "vendor" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.verified ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}>
                          {u.verified ? "Verified" : "Pending"}
                        </span>
                      )}
                      {u.role !== "vendor" && <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {u.role === "vendor" && !u.verified && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleVerify(u.id, u.name)}>
                            <UserCheck className="w-3 h-3 mr-1" /> Verify
                          </Button>
                        )}
                        {u.role === "vendor" && u.verified && (
                          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" disabled>
                            <CheckCircle className="w-3 h-3 mr-1" /> Verified
                          </Button>
                        )}
                        {u.status !== "Suspended" ? (
                          <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleSuspend(u.id, u.name)}>
                            <UserX className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-xs text-success" onClick={() => handleActivate(u.id, u.name)}>
                            <UserCheck className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
