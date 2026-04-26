import { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { Home, Map, ShoppingBag, User, LogOut, Wallet } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

const bottomNavItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/map", icon: Map, label: "Map" },
  { to: "/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function RecipientLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();

  const handleSignOut = () => {
    if (confirm("Are you sure you want to sign out?")) {
      logout();
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-heading font-bold text-lg text-primary">
          🌿 Lishe Pamoja
        </h1>
        <div className="flex items-center gap-2">
          <Link to="/wallet" className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="My Wallet">
            <Wallet className="w-5 h-5" />
          </Link>
          <NotificationBell />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t">
        <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
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
