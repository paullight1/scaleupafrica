import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/common/SiteLayout";
import { RequireAuth } from "@/components/common/RequireAuth";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { LoadingState } from "@/components/common/LoadingState";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthForgot from "./pages/AuthForgot";
import AuthReset from "./pages/AuthReset";
import Directory from "./pages/Directory";
import CreateProfile from "./pages/CreateProfile";
import Funding from "./pages/Funding";
import NotFound from "./pages/NotFound";

// Wave-3 pages (lazy — split from the initial bundle for mobile)
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const ProfileDetail = lazy(() => import("./pages/ProfileDetail"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));

// Public content + marketing pages
import Resources from "./pages/Resources";
import ResourceDetail from "./pages/ResourceDetail";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Admin
import AdminGuard from "./components/admin/AdminGuard";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProfiles from "./pages/admin/AdminProfiles";
import AdminResources from "./pages/admin/AdminResources";
import AdminResourceEdit from "./pages/admin/AdminResourceEdit";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminBlogEdit from "./pages/admin/AdminBlogEdit";
import AdminFunding from "./pages/admin/AdminFunding";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminNewsletter from "./pages/admin/AdminNewsletter";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLog from "./pages/admin/AdminAuditLog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MotionConfig reducedMotion="user">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Suspense fallback={<LoadingState className="min-h-[60vh]" label="Loading…" />}>
          <Routes>
            {/* Global chrome (auth-aware header + footer) on every non-admin route */}
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/forgot" element={<AuthForgot />} />
              <Route path="/auth/reset" element={<AuthReset />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/directory/:slug" element={<ProfileDetail />} />
              <Route path="/funding" element={<Funding />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />

              {/* Public resource hub + blog */}
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:slug" element={<ResourceDetail />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogDetail />} />

              {/* Marketing / legal */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Authed area */}
              <Route element={<RequireAuth />}>
                <Route path="/directory/create" element={<CreateProfile />} />
                {/* Dashboard owns its own internal sub-routing (home/profile/billing/activity) */}
                <Route path="/dashboard/*" element={<Dashboard />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin panel — its own chrome (AdminLayout), NOT wrapped in SiteLayout */}
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
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </MotionConfig>
  </QueryClientProvider>
);

export default App;
