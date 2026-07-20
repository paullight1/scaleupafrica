-- 20260720130000_directory_search_slug.sql
-- Plan 04 (Directory & Profiles). Owned by Plan 04 per FOUNDATION §8.3.
-- Adds: profiles.slug (+ trigger/backfill, "create" reserved), pg_trgm search indexes,
-- directory_facets(), show_email/phone/whatsapp flags + anon column-grant rewrite,
-- get_profile_contact(), increment_profile_views().
-- After applying: regenerate src/integrations/supabase/types.ts (never hand-edit).

-- ---------------------------------------------------------------------------
-- 1.1  Slug column (DB column + trigger, immutable once set)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify(_txt TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(unaccent(_txt)), '[^a-z0-9]+', '-', 'g'));
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.tg_profiles_set_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base TEXT; candidate TEXT; n INT := 0;
BEGIN
  -- Immutable once set: renaming the business must never break links already shared.
  IF NEW.slug IS NOT NULL THEN RETURN NEW; END IF;
  base := public.slugify(NEW.business_name);
  -- 'create' is reserved: /directory/create is a static route (React Router v6 ranks it
  -- above :slug), so a profile slugged 'create' would be unreachable.
  IF base = '' OR base = 'create' THEN base := 'business'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1;
    candidate := base || '-' || substr(replace(NEW.id::text, '-', ''), 1, 4 + n);
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_set_slug ON public.profiles;
CREATE TRIGGER profiles_set_slug BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_set_slug();

-- Backfill existing rows (fires the trigger, which fills NULL slugs).
UPDATE public.profiles SET business_name = business_name WHERE slug IS NULL;
ALTER TABLE public.profiles ALTER COLUMN slug SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles (slug);

-- ---------------------------------------------------------------------------
-- 1.2  Search + filter indexes
-- Decision: ilike-over-trgm (substring behavior users expect), not tsvector FTS.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_bname_trgm ON public.profiles USING gin (business_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_fname_trgm ON public.profiles USING gin (founder_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_keywords   ON public.profiles USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_profiles_country    ON public.profiles (country) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_sector     ON public.profiles (sector)  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_directory  ON public.profiles (status, featured DESC, created_at DESC);

-- ---------------------------------------------------------------------------
-- 1.3  Facets RPC (chip counts in one round-trip)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.directory_facets()
RETURNS TABLE (facet TEXT, value TEXT, count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'country', country, count(*) FROM public.profiles WHERE status = 'active' GROUP BY country
  UNION ALL
  SELECT 'sector', sector, count(*) FROM public.profiles WHERE status = 'active' GROUP BY sector;
$$;
GRANT EXECUTE ON FUNCTION public.directory_facets() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1.4  Contact visibility flags + column-level exposure (IMPROVEMENTS §3.10)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_email    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_whatsapp BOOLEAN NOT NULL DEFAULT true;

-- Remove raw contact from anon reads entirely. After this REVOKE, any anon query naming
-- email/phone/whatsapp/user_id (or select("*")) fails with a permission error — the Directory
-- and detail queries name safe columns explicitly. CreateProfile runs as `authenticated`.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, slug, business_name, founder_name, founder_photo_url, logo_url,
  country, sector, short_description, long_description, website, instagram, linkedin,
  twitter, keywords, status, featured, view_count, show_email, show_phone, show_whatsapp,
  created_at, updated_at)
  ON public.profiles TO anon;
-- email, phone, whatsapp, user_id deliberately NOT granted to anon.

-- Tradeoff: `authenticated` keeps full-row SELECT (needed for own-profile edit select("*")
-- and the admin panel). A logged-in scraper can still bulk-read contact columns; RLS cannot
-- express per-column rules. True rate-limiting/bot defense lands at the plan-07 NestJS layer
-- (GET /api/profiles/:id/contact with per-IP throttling); this RPC is the seam it replaces.
CREATE OR REPLACE FUNCTION public.get_profile_contact(_profile_id UUID)
RETURNS TABLE (email TEXT, phone TEXT, whatsapp TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN show_email    THEN email    END,
         CASE WHEN show_phone    THEN phone    END,
         CASE WHEN show_whatsapp THEN whatsapp END
  FROM public.profiles WHERE id = _profile_id AND status = 'active';
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_contact(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1.5  View counter RPC (mirrors increment_post_views). Plan 03 also calls this.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_profile_views(_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET view_count = view_count + 1 WHERE _id = id AND status = 'active';
$$;
GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO anon, authenticated;
