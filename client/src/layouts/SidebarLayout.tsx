import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Plus, ShoppingBag, BarChart3, CreditCard, Menu, X, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarLayoutProps {
  children: ReactNode;
  items: { to: string; icon: any; label: string }[];
  title: string;
}

export function SidebarLayout({ children, items, title }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!collapsed && <span className="font-heading font-bold text-sm">🌿 {title}</span>}
          <button onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }} className="p-1 rounded hover:bg-sidebar-accent">
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-4 h-4 lg:hidden" />}
            {!collapsed && <Menu className="w-4 h-4 hidden lg:block" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-heading font-semibold text-base">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

const vendorNavItems = [
  { to: "/vendor", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/vendor/listings", icon: Package, label: "Listings" },
  { to: "/vendor/create", icon: Plus, label: "New Listing" },
  { to: "/vendor/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/vendor/subscription", icon: CreditCard, label: "Subscription" },
  { to: "/vendor/reports", icon: BarChart3, label: "Reports" },
];

export function VendorLayout({ children }: { children: ReactNode }) {
  return <SidebarLayout items={vendorNavItems} title="Vendor Portal">{children}</SidebarLayout>;
}

const adminNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview" },
  { to: "/admin/users", icon: LayoutDashboard, label: "Users" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { to: "/admin/listings", icon: Package, label: "Listings" },
  { to: "/admin/reports", icon: BarChart3, label: "Reports" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return <SidebarLayout items={adminNavItems} title="Admin Panel">{children}</SidebarLayout>;
}
