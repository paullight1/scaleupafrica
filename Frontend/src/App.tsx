import { Toaster } from "@shared/components/ui/toaster";
import { Toaster as Sonner } from "@shared/components/ui/sonner";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@shared/hooks/useAuth";
import { SiteLayout } from "@/components/common/SiteLayout";
import { CookieConsent } from "@/components/common/CookieConsent";
import { RequireAuth } from "@/components/common/RequireAuth";
import { ScrollToTop } from "@shared/components/common/ScrollToTop";
import { LoadingState } from "@shared/components/common/LoadingState";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthSignUp from "./pages/AuthSignUp";
import AuthForgot from "./pages/AuthForgot";
import AuthReset from "./pages/AuthReset";
import Directory from "./pages/Directory";
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
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const FAQPage = lazy(() => import("./pages/FAQ"));


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
            {/* Global chrome (auth-aware header + footer) on every public route */}
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/signup" element={<AuthSignUp />} />
              <Route path="/auth/forgot" element={<AuthForgot />} />
              <Route path="/auth/reset" element={<AuthReset />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/directory/:slug" element={<ProfileDetail />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />

              {/* Retired standalone routes — funding and profile editing now live
                  inside the dashboard. Both were auth-gated already (/funding
                  bounced anon users to /auth), so the redirect targets sit behind
                  RequireAuth and the sign-in ?next= contract still applies. */}
              <Route path="/funding" element={<Navigate to="/dashboard/funding" replace />} />
              <Route path="/directory/create" element={<Navigate to="/dashboard/profile/edit" replace />} />

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
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/faq" element={<FAQPage />} />

              {/* Authed area */}
              <Route element={<RequireAuth />}>
                {/* Dashboard owns its own internal sub-routing
                    (home/funding/profile/profile-edit/account) */}
                <Route path="/dashboard/*" element={<Dashboard />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </Suspense>
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </MotionConfig>
  </QueryClientProvider>
);

export default App;
