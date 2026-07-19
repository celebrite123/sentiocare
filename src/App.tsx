import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { LazyRazorpayProvider } from "./components/LazyRazorpay";
import { isHospitalPortal } from "./lib/domain";

// Critical path components - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SelectPlan = lazy(() => import("./pages/SelectPlan"));
const Elders = lazy(() => import("./pages/Elders"));
const AddElder = lazy(() => import("./pages/AddElder"));
const EditElder = lazy(() => import("./pages/EditElder"));
const ManageMedicines = lazy(() => import("./pages/ManageMedicines"));
const HealthBook = lazy(() => import("./pages/HealthBook"));
const ElderSettings = lazy(() => import("./pages/ElderSettings"));
const ManageAccess = lazy(() => import("./pages/ManageAccess"));
const Profile = lazy(() => import("./pages/Profile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const CancellationRefund = lazy(() => import("./pages/CancellationRefund"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminCenter = lazy(() => import("./pages/AdminCenter"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

// B2B App shell (for both subdomain and legacy /b2b/ routes)
const B2BApp = lazy(() => import("./B2BApp"));

// B2B Pages - lazy loaded (for legacy /b2b/ routes on main domain)
const B2BLogin = lazy(() => import("./pages/b2b/B2BLogin"));
const B2BDashboard = lazy(() => import("./pages/b2b/B2BDashboard"));
const PatientUpload = lazy(() => import("./pages/b2b/PatientUpload"));
const PatientList = lazy(() => import("./pages/b2b/PatientList"));
const AlertsQueue = lazy(() => import("./pages/b2b/AlertsQueue"));
const PatientDetail = lazy(() => import("./pages/b2b/PatientDetail"));
const B2BReports = lazy(() => import("./pages/b2b/B2BReports"));
const B2BSettings = lazy(() => import("./pages/b2b/B2BSettings"));
const StaffManagement = lazy(() => import("./pages/b2b/StaffManagement"));

// Context providers
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { B2BRoute } from "./components/B2BRoute";

// Page loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  // Hospital subdomain → render standalone B2B app
  if (isHospitalPortal()) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Suspense fallback={<PageLoader />}>
                  <B2BApp />
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  // Main domain → render B2C app with legacy /b2b/ routes
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LazyRazorpayProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Suspense fallback={<PageLoader />}>
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
                      element={<ProtectedRoute allowWaitlisted><SelectPlan /></ProtectedRoute>} 
                    />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/elders" element={<ProtectedRoute><Elders /></ProtectedRoute>} />
                    <Route path="/elders/add" element={<ProtectedRoute><AddElder /></ProtectedRoute>} />
                    <Route path="/elders/:elderId/edit" element={<ProtectedRoute><EditElder /></ProtectedRoute>} />
                    <Route path="/elders/:elderId/medicines" element={<ProtectedRoute><ManageMedicines /></ProtectedRoute>} />
                    <Route path="/elders/:elderId/health-book" element={<ProtectedRoute><HealthBook /></ProtectedRoute>} />
                    <Route path="/elders/:elderId/settings" element={<ProtectedRoute><ElderSettings /></ProtectedRoute>} />
                    <Route path="/elders/:elderId/manage-access" element={<ProtectedRoute><ManageAccess /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminCenter /></AdminRoute>} />
                    {/* B2B Routes (legacy paths on main domain) */}
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
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </LazyRazorpayProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
