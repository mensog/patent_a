import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import Catalog from "./pages/buyer/Catalog";
import MaterialDetail from "./pages/buyer/MaterialDetail";
import RfqList from "./pages/buyer/RfqList";
import RfqDetail from "./pages/buyer/RfqDetail";
import OrderDetail from "./pages/buyer/OrderDetail";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import Offers from "./pages/supplier/Offers";
import PriceImport from "./pages/supplier/PriceImport";
import SupplierRfqResponse from "./pages/supplier/SupplierRfqResponse";
import ShipmentDetail from "./pages/supplier/ShipmentDetail";
import RoutePlanning from "./pages/supplier/RoutePlanning";
import ProfileSettings from "./pages/settings/ProfileSettings";
import CompanySettings from "./pages/settings/CompanySettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Buyer */}
            <Route path="/buyer" element={<ProtectedRoute><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/buyer/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
            <Route path="/buyer/material/:id" element={<ProtectedRoute><MaterialDetail /></ProtectedRoute>} />
            <Route path="/buyer/rfq" element={<ProtectedRoute><RfqList /></ProtectedRoute>} />
            <Route path="/buyer/rfq/:id" element={<ProtectedRoute><RfqDetail /></ProtectedRoute>} />
            <Route path="/buyer/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            {/* Supplier */}
            <Route path="/supplier" element={<ProtectedRoute><SupplierDashboard /></ProtectedRoute>} />
            <Route path="/supplier/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
            <Route path="/supplier/import" element={<ProtectedRoute><PriceImport /></ProtectedRoute>} />
            <Route path="/supplier/rfq/:id" element={<ProtectedRoute><SupplierRfqResponse /></ProtectedRoute>} />
            <Route path="/supplier/shipments/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
            <Route path="/supplier/routes" element={<ProtectedRoute><RoutePlanning /></ProtectedRoute>} />
            {/* Settings */}
            <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/settings/company" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
