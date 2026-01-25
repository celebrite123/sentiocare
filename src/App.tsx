import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
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

// B2B Pages
import B2BLogin from "./pages/b2b/B2BLogin";
import B2BDashboard from "./pages/b2b/B2BDashboard";
import PatientUpload from "./pages/b2b/PatientUpload";
import PatientList from "./pages/b2b/PatientList";
import AlertsQueue from "./pages/b2b/AlertsQueue";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { B2BRoute } from "./components/B2BRoute";
import PatientDetail from "./pages/b2b/PatientDetail";
import B2BReports from "./pages/b2b/B2BReports";
import B2BSettings from "./pages/b2b/B2BSettings";
import StaffManagement from "./pages/b2b/StaffManagement";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
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
            {/* B2B Routes */}
            <Route path="/b2b/login" element={<B2BLogin />} />
            <Route
              path="/b2b/*"
              element={
                <OrganizationProvider>
                  <Routes>
                    <Route path="dashboard" element={<B2BRoute><B2BDashboard /></B2BRoute>} />
                    <Route path="upload" element={<B2BRoute><PatientUpload /></B2BRoute>} />
                    <Route path="patients" element={<B2BRoute><PatientList /></B2BRoute>} />
                    <Route path="patients/:id" element={<B2BRoute><PatientDetail /></B2BRoute>} />
                    <Route path="alerts" element={<B2BRoute><AlertsQueue /></B2BRoute>} />
                    <Route path="reports" element={<B2BRoute><B2BReports /></B2BRoute>} />
                    <Route path="settings" element={<B2BRoute><B2BSettings /></B2BRoute>} />
                    <Route path="staff" element={<B2BRoute><StaffManagement /></B2BRoute>} />
                  </Routes>
                </OrganizationProvider>
              }
            />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
