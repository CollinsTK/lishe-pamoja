import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Package, Map, CheckSquare, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/logistics", icon: Package, label: "Dispatches" },
  { to: "/logistics/map", icon: Map, label: "Route Map" },
  { to: "/logistics/completed", icon: CheckSquare, label: "Completed" },
];

export function LogisticsLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-heading font-bold text-lg text-primary">🚚 Dispatch</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={logout} className="p-2 rounded-full hover:bg-muted transition-colors">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t">
        <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/logistics"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
