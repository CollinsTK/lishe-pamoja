import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { CartProvider } from "@/contexts/CartContext";
import { AutoLogout } from "@/components/AutoLogout";
import { Loader2 } from "lucide-react";

// Auth
import AuthPage from "./pages/AuthPage";
import AdminLoginPage from "./pages/AdminLoginPage";

// Unified Layout
import { DashboardLayout } from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";

// Dashboard Pages
import BrowseListings from "./pages/dashboard/BrowseListings";
import ListingDetails from "./pages/recipient/ListingDetails";
import MyOrders from "./pages/dashboard/MyOrders";
import MapView from "./pages/dashboard/MapView";
import WalletPage from "./pages/WalletPage";
import ProfilePage from "./pages/dashboard/ProfilePage";

// Sell Pages (require canSell capability)
import SellOverview from "./pages/dashboard/sell/SellOverview";
import MyListings from "./pages/vendor/VendorListings";
import CreateListing from "./pages/vendor/CreateListing";
import SalesOrders from "./pages/vendor/VendorOrders";
import SalesReports from "./pages/vendor/VendorReports";

// Deliver Pages (require canDeliver capability)
import DeliverOverview from "./pages/dashboard/deliver/DeliverOverview";
import ActiveDispatches from "./pages/logistics/LogisticsDispatches";
import RouteMap from "./pages/logistics/LogisticsMap";
import CompletedDeliveries from "./pages/logistics/LogisticsCompleted";

// Admin Pages (require isAdmin)
import AdminOverview from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminListings from "./pages/admin/AdminListings";
import AdminReports from "./pages/admin/AdminReports";

// Subscription
import SubscriptionPage from "./pages/dashboard/SubscriptionPage";

import NotFound from "./pages/NotFound";

// Capability Guard Component
function CapabilityGuard({
  children,
  capability,
}: {
  children: React.ReactNode;
  capability: "canSell" | "canDeliver";
}) {
  const { hasCapability } = useAuth();

  if (!hasCapability(capability)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Subscription Required</h2>
        <p className="text-muted-foreground mb-6">
          {capability === "canSell"
            ? "You need a Vendor or Business subscription to access this feature."
            : "You need a Logistics or Business subscription to access this feature."}
        </p>
        <Navigate to="/dashboard/subscription" replace />
      </div>
    );
  }

  return <>{children}</>;
}

// Admin Guard Component
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

// Unauthenticated redirect: admin paths → /admin/login, everything else → /auth
function UnauthenticatedRedirect() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Navigate to="/auth" replace />;
}

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isInitializing } = useAuth();

  // Show auth page immediately if not authenticated, even while initializing
  // This prevents the stuck "Verifying session..." screen
  if (!isAuthenticated && isInitializing) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="*" element={<UnauthenticatedRedirect />} />
      </Routes>
    );
  }

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="*" element={<UnauthenticatedRedirect />} />
      </Routes>
    );
  }

  return (
    <AutoLogout>
      <Routes>
        {/* Legacy redirects - redirect old role routes to new unified dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/listing/:id" element={<Navigate to="/dashboard/listings" replace />} />
        <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
        <Route path="/map" element={<Navigate to="/dashboard/map" replace />} />
        <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/wallet" element={<Navigate to="/dashboard/wallet" replace />} />

        {/* Vendor legacy redirects */}
        <Route path="/vendor" element={<Navigate to="/dashboard/sell" replace />} />
        <Route path="/vendor/listings" element={<Navigate to="/dashboard/sell/listings" replace />} />
        <Route path="/vendor/create" element={<Navigate to="/dashboard/sell/create" replace />} />
        <Route path="/vendor/orders" element={<Navigate to="/dashboard/sell/orders" replace />} />
        <Route path="/vendor/subscription" element={<Navigate to="/dashboard/subscription" replace />} />
        <Route path="/vendor/reports" element={<Navigate to="/dashboard/sell/reports" replace />} />
        <Route path="/vendor/map" element={<Navigate to="/dashboard/map" replace />} />
        <Route path="/vendor/wallet" element={<Navigate to="/dashboard/wallet" replace />} />

        {/* Logistics legacy redirects */}
        <Route path="/logistics" element={<Navigate to="/dashboard/deliver" replace />} />
        <Route path="/logistics/map" element={<Navigate to="/dashboard/deliver/map" replace />} />
        <Route path="/logistics/completed" element={<Navigate to="/dashboard/deliver/completed" replace />} />
        <Route path="/logistics/wallet" element={<Navigate to="/dashboard/wallet" replace />} />

        {/* Admin legacy redirects - old dashboard paths redirect to new /admin paths */}
        <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/dashboard/admin/users" element={<Navigate to="/admin/users" replace />} />
        <Route path="/dashboard/admin/subscriptions" element={<Navigate to="/admin/subscriptions" replace />} />
        <Route path="/dashboard/admin/listings" element={<Navigate to="/admin/listings" replace />} />
        <Route path="/dashboard/admin/reports" element={<Navigate to="/admin/reports" replace />} />

        {/* Unified Dashboard Routes */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/listings" replace />} />
        <Route path="/dashboard/listings" element={<DashboardLayout><BrowseListings /></DashboardLayout>} />
        <Route path="/dashboard/listings/:id" element={<DashboardLayout><ListingDetails /></DashboardLayout>} />
        <Route path="/dashboard/orders" element={<DashboardLayout><MyOrders /></DashboardLayout>} />
        <Route path="/dashboard/map" element={<DashboardLayout><MapView /></DashboardLayout>} />
        <Route path="/dashboard/wallet" element={<DashboardLayout><WalletPage /></DashboardLayout>} />
        <Route path="/dashboard/profile" element={<DashboardLayout><ProfilePage /></DashboardLayout>} />
        <Route path="/dashboard/subscription" element={<DashboardLayout><SubscriptionPage /></DashboardLayout>} />

        {/* Sell Routes - Protected by canSell capability */}
        <Route
          path="/dashboard/sell"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canSell">
                <SellOverview />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/sell/listings"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canSell">
                <MyListings />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/sell/create"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canSell">
                <CreateListing />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/sell/orders"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canSell">
                <SalesOrders />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/sell/reports"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canSell">
                <SalesReports />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />

        {/* Deliver Routes - Protected by canDeliver capability */}
        <Route
          path="/dashboard/deliver"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canDeliver">
                <DeliverOverview />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/deliver/active"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canDeliver">
                <ActiveDispatches />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/deliver/map"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canDeliver">
                <RouteMap />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard/deliver/completed"
          element={
            <DashboardLayout>
              <CapabilityGuard capability="canDeliver">
                <CompletedDeliveries />
              </CapabilityGuard>
            </DashboardLayout>
          }
        />

        {/* Admin Routes - Protected by isAdmin, wrapped in AdminLayout */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="listings" element={<AdminListings />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<div className="p-6 text-center text-muted-foreground">Settings page coming soon</div>} />
        </Route>

        {/* Auth */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AutoLogout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
