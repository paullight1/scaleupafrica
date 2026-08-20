import { Toaster } from "@shared/components/ui/toaster";
import { Toaster as Sonner } from "@shared/components/ui/sonner";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@shared/hooks/useAuth";
import { ScrollToTop } from "@shared/components/common/ScrollToTop";
import { LoadingState } from "@shared/components/common/LoadingState";
import { CrossAppRedirect, siteUrl } from "@shared/lib/crossApp";

// AdminGuard/AdminLayout stay eager — small wrappers every route renders through.
import AdminGuard from "./components/AdminGuard";
import AdminLayout from "./components/AdminLayout";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminProfiles = lazy(() => import("./pages/AdminProfiles"));
const AdminResources = lazy(() => import("./pages/AdminResources"));
const AdminResourceEdit = lazy(() => import("./pages/AdminResourceEdit"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const AdminBlogEdit = lazy(() => import("./pages/AdminBlogEdit"));
const AdminFunding = lazy(() => import("./pages/AdminFunding"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminNewsletter = lazy(() => import("./pages/AdminNewsletter"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));

const queryClient = new QueryClient();

/**
 * Routes keep their full "/admin/…" paths rather than using a router basename,
 * so every in-panel link is identical to what it was when admin lived inside the
 * public SPA. Anything outside /admin belongs to the other app — bounce it there.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Suspense fallback={<LoadingState className="min-h-[60vh]" label="Loading…" />}>
            <Routes>
              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="resources" element={<AdminResources />} />
                <Route path="resources/new" element={<AdminResourceEdit />} />
                <Route path="resources/:id" element={<AdminResourceEdit />} />
                <Route path="blog" element={<AdminBlog />} />
                <Route path="blog/new" element={<AdminBlogEdit />} />
                <Route path="blog/:id" element={<AdminBlogEdit />} />
                <Route path="funding" element={<AdminFunding />} />
                {/* admin-only sub-areas */}
                <Route
                  path="profiles"
                  element={
                    <AdminGuard require="admin">
                      <AdminProfiles />
                    </AdminGuard>
                  }
                />
                <Route
                  path="users"
                  element={
                    <AdminGuard require="admin">
                      <AdminUsers />
                    </AdminGuard>
                  }
                />
                <Route
                  path="leads"
                  element={
                    <AdminGuard require="admin">
                      <AdminLeads />
                    </AdminGuard>
                  }
                />
                <Route
                  path="newsletter"
                  element={
                    <AdminGuard require="admin">
                      <AdminNewsletter />
                    </AdminGuard>
                  }
                />
                <Route
                  path="payments"
                  element={
                    <AdminGuard require="admin">
                      <AdminPayments />
                    </AdminGuard>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <AdminGuard require="admin">
                      <AdminSettings />
                    </AdminGuard>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <AdminGuard require="admin">
                      <AdminAuditLog />
                    </AdminGuard>
                  }
                />
              </Route>

              {/* Not an admin route — it belongs to the public app. */}
              <Route path="*" element={<CrossAppRedirect to={siteUrl("/")} />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
