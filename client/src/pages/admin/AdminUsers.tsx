import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

const users = [
  { id: "u1", name: "Jane Wanjiku", email: "jane@example.com", role: "Recipient", status: "Active", joined: "2025-12-01" },
  { id: "u2", name: "John Kamau", email: "john@vendor.com", role: "Vendor", status: "Active", joined: "2025-11-15", verified: true },
  { id: "u3", name: "Peter Otieno", email: "peter@logistics.com", role: "Logistics", status: "Active", joined: "2026-01-10" },
  { id: "u4", name: "Mary Achieng", email: "mary@vendor.com", role: "Vendor", status: "Pending", joined: "2026-02-10", verified: false },
  { id: "u5", name: "David Mwangi", email: "david@example.com", role: "Recipient", status: "Active", joined: "2026-02-01" },
];

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">User Management</h1>
        <Badge variant="outline">{users.length} users</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Joined</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{u.role}</Badge>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{u.joined}</td>
                  <td className="p-3 text-right">
                    {u.role === "Vendor" && !("verified" in u && u.verified) && (
                      <Button size="sm" variant="outline" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Verify
                      </Button>
                    )}
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
