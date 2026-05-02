import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { CartProvider } from "@/contexts/CartContext";
import { AutoLogout } from "@/components/AutoLogout";
import { Loader2 } from "lucide-react";

// Auth
import AuthPage from "./pages/AuthPage";

// Recipient pages
import { RecipientLayout } from "./layouts/RecipientLayout";
import RecipientHome from "./pages/recipient/RecipientHome";
import ListingDetails from "./pages/recipient/ListingDetails";
import RecipientOrders from "./pages/recipient/RecipientOrders";
import RecipientMap from "./pages/recipient/RecipientMap";
import RecipientProfile from "./pages/recipient/RecipientProfile";
import WalletPage from "./pages/WalletPage";

// Vendor pages
import { VendorLayout } from "./layouts/SidebarLayout";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorListings from "./pages/vendor/VendorListings";
import CreateListing from "./pages/vendor/CreateListing";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorSubscription from "./pages/vendor/VendorSubscription";
import VendorReports from "./pages/vendor/VendorReports";

// Logistics pages
import { LogisticsLayout } from "./layouts/LogisticsLayout";
import LogisticsDispatches from "./pages/logistics/LogisticsDispatches";
import LogisticsMap from "./pages/logistics/LogisticsMap";
import LogisticsCompleted from "./pages/logistics/LogisticsCompleted";

// Admin pages
import { AdminLayout } from "./layouts/SidebarLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminListings from "./pages/admin/AdminListings";
import AdminReports from "./pages/admin/AdminReports";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isInitializing } = useAuth();

  // Show auth page immediately if not authenticated, even while initializing
  // This prevents the stuck "Verifying session..." screen
  if (!isAuthenticated && isInitializing) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
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
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <AutoLogout>
      <Routes>
      {/* Recipient routes */}
      <Route path="/" element={<RecipientLayout><RecipientHome /></RecipientLayout>} />
      <Route path="/listing/:id" element={<RecipientLayout><ListingDetails /></RecipientLayout>} />
      <Route path="/orders" element={<RecipientLayout><RecipientOrders /></RecipientLayout>} />
      <Route path="/map" element={<RecipientLayout><RecipientMap /></RecipientLayout>} />
      <Route path="/profile" element={<RecipientLayout><RecipientProfile /></RecipientLayout>} />
      <Route path="/wallet" element={<RecipientLayout><WalletPage /></RecipientLayout>} />

      {/* Vendor routes */}
      <Route path="/vendor" element={<VendorLayout><VendorDashboard /></VendorLayout>} />
      <Route path="/vendor/listings" element={<VendorLayout><VendorListings /></VendorLayout>} />
      <Route path="/vendor/create" element={<VendorLayout><CreateListing /></VendorLayout>} />
      <Route path="/vendor/orders" element={<VendorLayout><VendorOrders /></VendorLayout>} />
      <Route path="/vendor/subscription" element={<VendorLayout><VendorSubscription /></VendorLayout>} />
      <Route path="/vendor/reports" element={<VendorLayout><VendorReports /></VendorLayout>} />
      <Route path="/vendor/wallet" element={<VendorLayout><WalletPage /></VendorLayout>} />

      {/* Logistics routes */}
      <Route path="/logistics" element={<LogisticsLayout><LogisticsDispatches /></LogisticsLayout>} />
      <Route path="/logistics/map" element={<LogisticsLayout><LogisticsMap /></LogisticsLayout>} />
      <Route path="/logistics/completed" element={<LogisticsLayout><LogisticsCompleted /></LogisticsLayout>} />
      <Route path="/logistics/wallet" element={<LogisticsLayout><WalletPage /></LogisticsLayout>} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
      <Route path="/admin/subscriptions" element={<AdminLayout><AdminSubscriptions /></AdminLayout>} />
      <Route path="/admin/listings" element={<AdminLayout><AdminListings /></AdminLayout>} />
      <Route path="/admin/reports" element={<AdminLayout><AdminReports /></AdminLayout>} />

      {/* Auth */}
      <Route path="/auth" element={<Navigate to="/" replace />} />
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
          <CartProvider>
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
