import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* Buyer */}
          <Route path="/buyer" element={<BuyerDashboard />} />
          <Route path="/buyer/catalog" element={<Catalog />} />
          <Route path="/buyer/material/:id" element={<MaterialDetail />} />
          <Route path="/buyer/rfq" element={<RfqList />} />
          <Route path="/buyer/rfq/:id" element={<RfqDetail />} />
          <Route path="/buyer/orders/:id" element={<OrderDetail />} />
          {/* Supplier */}
          <Route path="/supplier" element={<SupplierDashboard />} />
          <Route path="/supplier/offers" element={<Offers />} />
          <Route path="/supplier/import" element={<PriceImport />} />
          <Route path="/supplier/rfq/:id" element={<SupplierRfqResponse />} />
          <Route path="/supplier/shipments/:id" element={<ShipmentDetail />} />
          <Route path="/supplier/routes" element={<RoutePlanning />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
