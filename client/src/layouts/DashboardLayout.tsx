import { ReactNode, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  ShoppingBag,
  BarChart3,
  CreditCard,
  Menu,
  X,
  LogOut,
  Wallet,
  Map,
  User,
  Truck,
  CheckSquare,
  Send,
  Shield,
  Users,
  Store,
  ShoppingCart,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  capability?: "canBrowse" | "canSell" | "canDeliver";
  adminOnly?: boolean;
}

// Navigation items with capability requirements
const allNavItems: NavItem[] = [
  // Browse/Buy - available to all users
  { to: "/dashboard/map", icon: Map, label: "Map View", capability: "canBrowse" },
  { to: "/dashboard/orders", icon: ShoppingBag, label: "My Orders", capability: "canBrowse" },

  // Vendor features - require canSell
  { to: "/dashboard/sell", icon: Store, label: "Sell Food", capability: "canSell" },
  { to: "/dashboard/sell/listings", icon: Package, label: "My Listings", capability: "canSell" },
  { to: "/dashboard/sell/create", icon: Plus, label: "Create Listing", capability: "canSell" },
  { to: "/dashboard/sell/orders", icon: ShoppingBag, label: "Sales Orders", capability: "canSell" },
  { to: "/dashboard/sell/reports", icon: BarChart3, label: "Sales Reports", capability: "canSell" },

  // Logistics features - require canDeliver
  { to: "/dashboard/deliver", icon: Truck, label: "Deliveries", capability: "canDeliver" },
  { to: "/dashboard/deliver/dispatches", icon: Send, label: "Dispatches", capability: "canDeliver" },
  { to: "/dashboard/deliver/reports", icon: BarChart3, label: "Delivery Reports", capability: "canDeliver" },

  // Admin features - require isAdmin
  { to: "/admin", icon: Shield, label: "Admin Panel", adminOnly: true },
  { to: "/admin/users", icon: Users, label: "Manage Users", adminOnly: true },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", adminOnly: true },
  { to: "/admin/listings", icon: Package, label: "All Listings", adminOnly: true },
  { to: "/admin/reports", icon: BarChart3, label: "Platform Reports", adminOnly: true },

  // Common features
  { to: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
  { to: "/dashboard/profile", icon: User, label: "Profile" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user, hasCapability, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMapPage = pathname === "/dashboard/map";
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((t, i) => t + i.quantity, 0);

  // Mobile bottom nav items - most important items only
  const mobileNavItems = allNavItems.filter((item) => {
    // Only show main features on mobile bottom nav
    const mobilePaths = [
      "/dashboard/map",
      "/dashboard/orders",
      "/dashboard/sell",
      "/dashboard/deliver",
      "/dashboard/wallet",
      "/dashboard/profile",
    ];
    if (item.adminOnly) return false;
    if (!mobilePaths.includes(item.to)) return false;
    if (item.capability) return hasCapability(item.capability);
    return true;
  });

  // Filter nav items based on capabilities
  const visibleNavItems = allNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.capability) return hasCapability(item.capability);
    return true; // Items without capability requirement are visible to all
  });

  // Group items by section for better organization
  const browseItems = visibleNavItems.filter(
    (i) => i.capability === "canBrowse" && !i.to.includes("/sell/") && !i.to.includes("/deliver/")
  );
  const sellItems = visibleNavItems.filter((i) => i.to.startsWith("/dashboard/sell/"));
  const deliverItems = visibleNavItems.filter((i) => i.to.startsWith("/dashboard/deliver/"));
  const adminItems = visibleNavItems.filter((i) => i.adminOnly);
  const commonItems = visibleNavItems.filter(
    (i) => !i.capability && !i.adminOnly && !i.to.startsWith("/dashboard/sell/") && !i.to.startsWith("/dashboard/deliver/")
  );

  const handleSignOut = () => {
    if (confirm("Are you sure you want to sign out?")) {
      logout();
      window.location.href = "/auth";
    }
  };

  const NavSection = ({ title, items }: { title?: string; items: NavItem[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-2">
        {title && !collapsed && (
          <h3 className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            {title}
          </h3>
        )}
        {collapsed && title && (
          <div className="px-3 py-2 flex justify-center">
            <div className="w-1 h-1 rounded-full bg-sidebar-foreground/30" />
          </div>
        )}
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out ${
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-sm shadow-primary/10 border border-primary/20"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              <div className={`relative flex items-center justify-center w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${collapsed ? "" : ""}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {collapsed && (
                  <span className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-full opacity-0 group-[.active]:opacity-100 transition-opacity" />
                )}
              </div>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-[1090] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop Sidebar - Fixed */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-[1100] flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border/60 flex-shrink-0 bg-sidebar-accent/30">
          {!collapsed ? (
            <Link to="/dashboard" className="font-heading font-bold text-sm hover:opacity-80 transition-opacity flex items-center gap-2">
              <span className="text-lg">🌿</span>
              <span className="truncate">Lishe Pamoja</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="text-lg hover:opacity-80 transition-opacity">🌿</Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-sidebar-accent hover:shadow-sm transition-all duration-200 active:scale-95"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <Menu className="w-4 h-4 text-sidebar-foreground/70" />
            ) : (
              <Menu className="w-4 h-4 text-sidebar-foreground/70" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto sidebar-scroll">
          <NavSection items={browseItems} />
          <NavSection title="Selling" items={sellItems} />
          <NavSection title="Logistics" items={deliverItems} />
          <NavSection title="Admin" items={adminItems} />
          <NavSection items={commonItems} />
        </nav>

        <div className="p-3 border-t border-sidebar-border/60 flex-shrink-0">
          <button
            onClick={handleSignOut}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full hover:translate-x-0.5"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-[1100] flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 w-72 shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border/60 flex-shrink-0">
          <Link to="/dashboard" className="font-heading font-bold text-sm hover:opacity-80 transition-opacity">
            🌿 Lishe Pamoja
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto sidebar-scroll">
          <NavSection items={browseItems} />
          <NavSection title="Selling" items={sellItems} />
          <NavSection title="Logistics" items={deliverItems} />
          <NavSection title="Admin" items={adminItems} />
          <NavSection items={commonItems} />
        </nav>

        <div className="p-3 border-t border-sidebar-border/60 flex-shrink-0">
          <button
            onClick={handleSignOut}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-w-0 lg:ml-0 ${collapsed ? "lg:ml-16" : "lg:ml-60"} transition-all duration-300 h-full`}>
        {/* Fixed Header */}
        <header className="flex-shrink-0 z-[1050] bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1" title="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-heading font-semibold text-base">
              Welcome, {user?.name?.split(" ")[0] || "User"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => navigate("/dashboard/cart")}
              className="relative p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="My Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className={`flex-1 overflow-y-auto page-scroll ${isMapPage ? "p-0 pb-16 lg:pb-0 overflow-hidden" : "p-4 lg:p-6 pb-20 lg:pb-6"}`}>
          <div className={isMapPage ? "h-full" : "max-w-[1200px] mx-auto w-full"}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[1050] bg-card border-t border-border">
          <div className="flex items-center justify-around py-2">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label.split(" ")[0]}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

