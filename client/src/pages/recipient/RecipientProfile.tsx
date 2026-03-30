import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, LogOut } from "lucide-react";

export default function RecipientProfile() {
  const { user, logout } = useAuth();

  return (
    <div className="px-4 pt-4 space-y-4">
      <h2 className="font-heading font-bold text-xl">Profile</h2>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="font-heading font-semibold">{user?.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Mail className="w-4 h-4" /> {user?.email}
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Phone className="w-4 h-4" /> {user?.phone}
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h4 className="font-heading font-semibold text-sm">Quick Stats</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-muted rounded-xl">
            <p className="font-heading font-bold text-lg text-primary">3</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-xl">
            <p className="font-heading font-bold text-lg text-primary">2</p>
            <p className="text-[10px] text-muted-foreground">Claimed</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-xl">
            <p className="font-heading font-bold text-lg text-primary">KES 340</p>
            <p className="text-[10px] text-muted-foreground">Saved</p>
          </div>
        </div>
      </Card>

      <Button variant="outline" className="w-full" onClick={logout}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
