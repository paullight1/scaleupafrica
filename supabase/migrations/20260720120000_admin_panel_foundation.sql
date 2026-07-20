-- ============================================================================
-- Admin Panel Foundation
-- RBAC, content management (resources + blog), leads, newsletter, analytics,
-- site settings, audit log, curated funding, storage buckets, and admin RPCs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ROLES / RBAC
-- Roles live in their OWN table (never on profiles) and are checked through a
-- SECURITY DEFINER function so RLS policies can call it without recursion.
-- ---------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- Staff = admin or editor (content managers)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'editor');
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO anon, authenticated, service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE POLICY "Users read own roles, admins read all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed the first admin (safe no-op if the user does not exist yet).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'nwosupaul3@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. PROFILES — moderation columns + admin override
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'hidden', 'flagged')),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

CREATE POLICY "Admins manage all profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. SUBSCRIPTIONS — admin read + write
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins view all subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. RESOURCES (templates, playbooks, guides, ebooks, articles, checklists)
-- ---------------------------------------------------------------------------
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'article'
    CHECK (type IN ('template', 'playbook', 'guide', 'ebook', 'article', 'checklist', 'toolkit', 'webinar', 'case-study')),
  category TEXT,
  excerpt TEXT,
  content TEXT,                       -- markdown body for article-style resources
  cover_image_url TEXT,
  file_url TEXT,                      -- downloadable PDF / asset (public bucket)
  file_name TEXT,
  file_size_kb INTEGER,
  topics TEXT[] NOT NULL DEFAULT '{}',
  gated BOOLEAN NOT NULL DEFAULT false,   -- require email capture before download
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  read_time_min INTEGER,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

CREATE INDEX resources_status_idx ON public.resources (status);
CREATE INDEX resources_type_idx ON public.resources (type);

CREATE POLICY "Public read published resources"
  ON public.resources FOR SELECT
  USING (status = 'published' OR public.is_staff(auth.uid()));

CREATE POLICY "Staff manage resources"
  ON public.resources FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. BLOG POSTS
-- ---------------------------------------------------------------------------
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,                       -- markdown body
  cover_image_url TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  read_time_min INTEGER,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

CREATE INDEX blog_posts_status_idx ON public.blog_posts (status);

CREATE POLICY "Public read published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.is_staff(auth.uid()));

CREATE POLICY "Staff manage posts"
  ON public.blog_posts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. CURATED FUNDING OPPORTUNITIES (admin-verified, complements AI feed)
-- ---------------------------------------------------------------------------
CREATE TABLE public.funding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  type TEXT,
  summary TEXT,
  amount TEXT,
  opens TEXT,
  deadline TEXT,
  eligibility TEXT,
  url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  country_focus TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_opportunities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.funding_opportunities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.funding_opportunities TO authenticated;
GRANT ALL ON public.funding_opportunities TO service_role;

CREATE POLICY "Public read published funding"
  ON public.funding_opportunities FOR SELECT
  USING (status = 'published' OR public.is_staff(auth.uid()));

CREATE POLICY "Staff manage funding"
  ON public.funding_opportunities FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. LEADS (contact form + gated resource downloads + demo requests)
-- Public can INSERT; only admins can read/manage.
-- ---------------------------------------------------------------------------
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'contact'
    CHECK (source IN ('contact', 'resource_download', 'demo', 'other')),
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

CREATE POLICY "Anyone can submit a lead"
  ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 8. NEWSLETTER SUBSCRIBERS
-- ---------------------------------------------------------------------------
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed'
    CHECK (status IN ('subscribed', 'unsubscribed')),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read subscribers"
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update subscribers"
  ON public.newsletter_subscribers FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 9. ANALYTICS EVENTS (lightweight product analytics powering the dashboard)
-- Anyone can log; only admins can read.
-- ---------------------------------------------------------------------------
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  path TEXT,
  entity_type TEXT,
  entity_id UUID,
  user_id UUID,
  session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

CREATE INDEX analytics_events_type_created_idx ON public.analytics_events (event_type, created_at DESC);

CREATE POLICY "Anyone can log events"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 10. SITE SETTINGS (announcement banner, feature flags, contact info)
-- Public read (for banner/flags), admin write.
-- ---------------------------------------------------------------------------
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

CREATE POLICY "Public read settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins write settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.site_settings (key, value) VALUES
  ('announcement', '{"enabled": false, "message": "", "link": ""}'),
  ('features', '{"resources": true, "blog": true, "funding": true}')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. ADMIN AUDIT LOG
-- ---------------------------------------------------------------------------
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
GRANT INSERT, SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

CREATE POLICY "Admins read audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff write audit log"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 12. updated_at triggers for new tables
-- ---------------------------------------------------------------------------
CREATE TRIGGER resources_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER funding_opportunities_updated_at BEFORE UPDATE ON public.funding_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- 13. STORAGE BUCKETS (public read; only staff write)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('resource-files', 'resource-files', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('content-media', 'content-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read content files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id IN ('resource-files', 'content-media'));

CREATE POLICY "Staff upload content files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('resource-files', 'content-media') AND public.is_staff(auth.uid()));

CREATE POLICY "Staff update content files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('resource-files', 'content-media') AND public.is_staff(auth.uid()));

CREATE POLICY "Staff delete content files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('resource-files', 'content-media') AND public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 14. ADMIN RPCs (SECURITY DEFINER, self-guarded with is_admin)
-- ---------------------------------------------------------------------------

-- Aggregate dashboard KPIs in one round-trip.
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT CASE WHEN public.is_admin(auth.uid()) THEN jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'total_profiles', (SELECT count(*) FROM public.profiles),
    'active_subscriptions', (SELECT count(*) FROM public.subscriptions
        WHERE has_access AND (expires_at IS NULL OR expires_at > now())),
    'new_users_7d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_users_30d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'new_profiles_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'total_resources', (SELECT count(*) FROM public.resources),
    'published_resources', (SELECT count(*) FROM public.resources WHERE status = 'published'),
    'total_posts', (SELECT count(*) FROM public.blog_posts),
    'published_posts', (SELECT count(*) FROM public.blog_posts WHERE status = 'published'),
    'total_leads', (SELECT count(*) FROM public.leads),
    'new_leads', (SELECT count(*) FROM public.leads WHERE status = 'new'),
    'newsletter_subs', (SELECT count(*) FROM public.newsletter_subscribers WHERE status = 'subscribed'),
    'flagged_profiles', (SELECT count(*) FROM public.profiles WHERE status = 'flagged'),
    'funding_searches_30d', (SELECT count(*) FROM public.analytics_events
        WHERE event_type = 'funding_search' AND created_at > now() - interval '30 days'),
    'resource_downloads_30d', (SELECT count(*) FROM public.analytics_events
        WHERE event_type = 'resource_download' AND created_at > now() - interval '30 days'),
    'page_views_30d', (SELECT count(*) FROM public.analytics_events
        WHERE event_type = 'page_view' AND created_at > now() - interval '30 days')
  ) ELSE '{}'::jsonb END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- Daily time series for a given metric over N days.
CREATE OR REPLACE FUNCTION public.admin_timeseries(_metric TEXT, _days INTEGER DEFAULT 30)
RETURNS TABLE (day DATE, count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  WITH days AS (
    SELECT generate_series(
      (current_date - (_days - 1)),
      current_date,
      interval '1 day'
    )::date AS day
  ),
  events AS (
    SELECT created_at::date AS day, count(*) AS c
    FROM (
      SELECT created_at FROM auth.users
        WHERE _metric = 'signups' AND public.is_admin(auth.uid())
      UNION ALL
      SELECT created_at FROM public.analytics_events
        WHERE _metric <> 'signups' AND event_type = _metric AND public.is_admin(auth.uid())
    ) e
    GROUP BY 1
  )
  SELECT d.day, COALESCE(ev.c, 0) AS count
  FROM days d LEFT JOIN events ev ON ev.day = d.day
  ORDER BY d.day;
$$;

GRANT EXECUTE ON FUNCTION public.admin_timeseries(TEXT, INTEGER) TO authenticated;

-- Full user roster with subscription + role + profile join (admin only).
CREATE OR REPLACE FUNCTION public.admin_list_users(_search TEXT DEFAULT NULL, _limit INTEGER DEFAULT 200)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  business_name TEXT,
  country TEXT,
  has_access BOOLEAN,
  expires_at TIMESTAMPTZ,
  is_admin BOOLEAN,
  is_editor BOOLEAN
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    p.business_name,
    p.country,
    COALESCE(s.has_access, false),
    s.expires_at,
    public.has_role(u.id, 'admin'),
    public.has_role(u.id, 'editor')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  WHERE public.is_admin(auth.uid())
    AND (_search IS NULL OR _search = ''
         OR u.email ILIKE '%' || _search || '%'
         OR p.business_name ILIKE '%' || _search || '%')
  ORDER BY u.created_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT, INTEGER) TO authenticated;

-- Atomic view/download counters (avoids read-modify-write races from clients).
CREATE OR REPLACE FUNCTION public.increment_resource_metric(_id UUID, _metric TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _metric = 'view' THEN
    UPDATE public.resources SET view_count = view_count + 1 WHERE id = _id;
  ELSIF _metric = 'download' THEN
    UPDATE public.resources SET download_count = download_count + 1 WHERE id = _id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_resource_metric(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_post_views(_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts SET view_count = view_count + 1 WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_post_views(UUID) TO anon, authenticated;
