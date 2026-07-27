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

// Public content + marketing pages (lazy — secondary routes, keep the mobile entry lean)
const Resources = lazy(() => import("./pages/Resources"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

// Admin panel — staff-only; lazy so none of it ships in the public bundle.
// AdminGuard/AdminLayout stay eager (small layout-route wrappers).
import AdminGuard from "./components/admin/AdminGuard";
import AdminLayout from "./components/admin/AdminLayout";
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminProfiles = lazy(() => import("./pages/admin/AdminProfiles"));
const AdminResources = lazy(() => import("./pages/admin/AdminResources"));
const AdminResourceEdit = lazy(() => import("./pages/admin/AdminResourceEdit"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminBlogEdit = lazy(() => import("./pages/admin/AdminBlogEdit"));
const AdminFunding = lazy(() => import("./pages/admin/AdminFunding"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));

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
