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
import SetupWorkspace from "./pages/auth/SetupWorkspace";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import BuyerOrders from "./pages/buyer/BuyerOrders";
import Catalog from "./pages/buyer/Catalog";
import MaterialDetail from "./pages/buyer/MaterialDetail";
import RfqList from "./pages/buyer/RfqList";
import RfqDetail from "./pages/buyer/RfqDetail";
import OrderDetail from "./pages/buyer/OrderDetail";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import Offers from "./pages/supplier/Offers";
import PriceImport from "./pages/supplier/PriceImport";
import SupplierRfqList from "./pages/supplier/SupplierRfqList";
import SupplierRfqResponse from "./pages/supplier/SupplierRfqResponse";
import SupplierShipments from "./pages/supplier/SupplierShipments";
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
            <Route path="/setup" element={<ProtectedRoute requireCompany={false}><SetupWorkspace /></ProtectedRoute>} />
            {/* Buyer */}
            <Route path="/buyer" element={<ProtectedRoute allowedRoles={['buyer', 'manager', 'admin']}><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/buyer/catalog" element={<ProtectedRoute allowedRoles={['buyer', 'manager', 'admin']}><Catalog /></ProtectedRoute>} />
            <Route path="/buyer/material/:id" element={<ProtectedRoute allowedRoles={['buyer', 'manager', 'admin']}><MaterialDetail /></ProtectedRoute>} />
            <Route path="/buyer/rfq" element={<ProtectedRoute allowedRoles={['buyer', 'manager', 'admin']}><RfqList /></ProtectedRoute>} />
            <Route path="/buyer/rfq/:id" element={<ProtectedRoute allowedRoles={['buyer', 'manager', 'admin']}><RfqDetail /></ProtectedRoute>} />
            <Route path="/buyer/orders" element={<ProtectedRoute allowedRoles={['buyer', 'manager', 'admin']}><BuyerOrders /></ProtectedRoute>} />
            <Route path="/buyer/orders/:id" element={<ProtectedRoute allowedRoles={['buyer', 'manager', 'admin']}><OrderDetail /></ProtectedRoute>} />
            {/* Supplier */}
            <Route path="/supplier" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><SupplierDashboard /></ProtectedRoute>} />
            <Route path="/supplier/offers" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><Offers /></ProtectedRoute>} />
            <Route path="/supplier/import" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><PriceImport /></ProtectedRoute>} />
            <Route path="/supplier/rfq" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><SupplierRfqList /></ProtectedRoute>} />
            <Route path="/supplier/rfq/:id" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><SupplierRfqResponse /></ProtectedRoute>} />
            <Route path="/supplier/orders/:id" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><OrderDetail /></ProtectedRoute>} />
            <Route path="/supplier/shipments" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><SupplierShipments /></ProtectedRoute>} />
            <Route path="/supplier/shipments/:id" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><ShipmentDetail /></ProtectedRoute>} />
            <Route path="/supplier/routes" element={<ProtectedRoute allowedRoles={['supplier', 'manager', 'admin']}><RoutePlanning /></ProtectedRoute>} />
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
