import { Toaster } from "@shared/components/ui/toaster";
import { Toaster as Sonner } from "@shared/components/ui/sonner";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@shared/hooks/useAuth";
import { ScrollToTop } from "@shared/components/common/ScrollToTop";
import AdminGuard from "./components/AdminGuard";
import AdminLayout from "./components/AdminLayout";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminProfiles = lazy(() => import("./pages/AdminProfiles"));
const AdminResources = lazy(() => import("./pages/AdminResources"));
const AdminResourceEdit = lazy(() => import("./pages/AdminResourceEdit"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const AdminBlogEdit = lazy(() => import("./pages/AdminBlogEdit"));
const AdminFundingWorkspace = lazy(() => import("./pages/AdminFundingWorkspace"));
const AdminFunding = lazy(() => import("./pages/AdminFunding"));
const AdminFundingSources = lazy(() => import("./pages/AdminFundingSources"));
const AdminFundingReports = lazy(() => import("./pages/AdminFundingReports"));
const AdminFundingEngine = lazy(() => import("./pages/AdminFundingEngine"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminNewsletter = lazy(() => import("./pages/AdminNewsletter"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminGuard require="admin"><AdminDashboard /></AdminGuard>} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="resources/new" element={<AdminResourceEdit />} />
              <Route path="resources/:id" element={<AdminResourceEdit />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="blog/new" element={<AdminBlogEdit />} />
              <Route path="blog/:id" element={<AdminBlogEdit />} />
              <Route path="funding" element={<AdminGuard require="admin"><AdminFundingWorkspace /></AdminGuard>}>
                <Route index element={<AdminFunding />} />
                <Route path="sources" element={<AdminFundingSources />} />
                <Route path="reports" element={<AdminFundingReports />} />
                <Route path="engine" element={<AdminFundingEngine />} />
              </Route>
              <Route path="profiles" element={<AdminGuard require="admin"><AdminProfiles /></AdminGuard>} />
              <Route path="users" element={<AdminGuard require="admin"><AdminUsers /></AdminGuard>} />
              <Route path="leads" element={<AdminGuard require="admin"><AdminLeads /></AdminGuard>} />
              <Route path="newsletter" element={<AdminGuard require="admin"><AdminNewsletter /></AdminGuard>} />
              <Route path="payments" element={<AdminGuard require="admin"><AdminPayments /></AdminGuard>} />
              <Route path="settings" element={<AdminGuard require="admin"><AdminSettings /></AdminGuard>} />
              <Route path="audit" element={<AdminGuard require="admin"><AdminAuditLog /></AdminGuard>} />
            </Route>
            <Route path="*" element={<Navigate to="/admin/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
