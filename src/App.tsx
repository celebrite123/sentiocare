import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import SelectPlan from "./pages/SelectPlan";
import Elders from "./pages/Elders";
import AddElder from "./pages/AddElder";
import EditElder from "./pages/EditElder";
import ManageMedicines from "./pages/ManageMedicines";
import HealthBook from "./pages/HealthBook";
import ElderSettings from "./pages/ElderSettings";
import ManageAccess from "./pages/ManageAccess";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ContactUs from "./pages/ContactUs";
import CancellationRefund from "./pages/CancellationRefund";
import NotFound from "./pages/NotFound";
import AdminCenter from "./pages/AdminCenter";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/cancellation-refund" element={<CancellationRefund />} />
            <Route 
              path="/select-plan" 
              element={
                <ProtectedRoute>
                  <SelectPlan />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/elders" 
              element={
                <ProtectedRoute>
                  <Elders />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/elders/add" 
              element={
                <ProtectedRoute>
                  <AddElder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/elders/:elderId/edit" 
              element={
                <ProtectedRoute>
                  <EditElder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/elders/:elderId/medicines" 
              element={
                <ProtectedRoute>
                  <ManageMedicines />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/elders/:elderId/health-book" 
              element={
                <ProtectedRoute>
                  <HealthBook />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/elders/:elderId/settings" 
              element={
                <ProtectedRoute>
                  <ElderSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/elders/:elderId/manage-access" 
              element={
                <ProtectedRoute>
                  <ManageAccess />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminCenter />
                </AdminRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
