import { Routes, Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { B2BRoute } from "./components/B2BRoute";

// B2B Pages - lazy loaded
const B2BLogin = lazy(() => import("./pages/b2b/B2BLogin"));
const B2BDashboard = lazy(() => import("./pages/b2b/B2BDashboard"));
const PatientUpload = lazy(() => import("./pages/b2b/PatientUpload"));
const PatientList = lazy(() => import("./pages/b2b/PatientList"));
const AlertsQueue = lazy(() => import("./pages/b2b/AlertsQueue"));
const PatientDetail = lazy(() => import("./pages/b2b/PatientDetail"));
const B2BReports = lazy(() => import("./pages/b2b/B2BReports"));
const B2BSettings = lazy(() => import("./pages/b2b/B2BSettings"));
const StaffManagement = lazy(() => import("./pages/b2b/StaffManagement"));

/**
 * Standalone B2B App shell for hospital.sentio.in.net
 * All routes are top-level (no /b2b/ prefix) since the subdomain provides context.
 */
const B2BApp = () => (
  <OrganizationProvider>
    <Routes>
      <Route path="/login" element={<B2BLogin />} />
      <Route path="/dashboard" element={<B2BRoute><B2BDashboard /></B2BRoute>} />
      <Route path="/upload" element={<B2BRoute><PatientUpload /></B2BRoute>} />
      <Route path="/patients" element={<B2BRoute><PatientList /></B2BRoute>} />
      <Route path="/patients/:id" element={<B2BRoute><PatientDetail /></B2BRoute>} />
      <Route path="/alerts" element={<B2BRoute><AlertsQueue /></B2BRoute>} />
      <Route path="/reports" element={<B2BRoute><B2BReports /></B2BRoute>} />
      <Route path="/settings" element={<B2BRoute><B2BSettings /></B2BRoute>} />
      <Route path="/staff" element={<B2BRoute><StaffManagement /></B2BRoute>} />
      {/* Default: redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </OrganizationProvider>
);

export default B2BApp;
