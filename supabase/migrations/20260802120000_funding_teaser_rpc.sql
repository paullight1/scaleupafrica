-- ---------------------------------------------------------------------------
-- funding_teaser: a member-safe preview of the curated feed.
--
-- 20260720140000 made the whole of funding_opportunities a member benefit
-- (RLS: `has_active_subscription(auth.uid()) OR is_staff(auth.uid())`), which is
-- correct — but it left signed-in NON-members with literally zero rows, so the
-- dashboard rendered "the curated feed is being prepared". That told a
-- prospective customer the product was unfinished rather than that it was paid.
--
-- This function is the one narrow, deliberate hole in that gate: it returns a
-- handful of rows with ONLY the columns that advertise the feed
-- (title, funder, type, deadline) and never the columns a member pays for
-- (url, summary, eligibility, amount, details). It is SECURITY DEFINER because
-- it must see rows the caller's RLS policy hides.
--
-- Invariants that keep this safe — change any of them and re-audit:
--   * The column list below is the entire disclosure. No SELECT *.
--   * `_limit` is clamped server-side; the caller cannot enumerate the table.
--   * Only `status = 'published'` rows are ever visible.
--   * EXECUTE is granted to `authenticated` only — `anon` cannot call it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.funding_teaser(_limit INT DEFAULT 3)
RETURNS TABLE (
  id UUID,
  title TEXT,
  funder TEXT,
  type TEXT,
  deadline TEXT,
  total_published BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH published AS (
    SELECT o.id, o.title, o.funder, o.type, o.deadline, o.featured, o.created_at
    FROM public.funding_opportunities o
    WHERE o.status = 'published'
  ),
  total AS (
    SELECT count(*) AS n FROM published
  )
  SELECT p.id, p.title, p.funder, p.type, p.deadline, t.n
  FROM published p
  CROSS JOIN total t
  -- `deadline` is TEXT (free-form, e.g. "31 March 2026" or "Rolling"), so it
  -- cannot be ordered chronologically in SQL without lying. Order by editorial
  -- priority then recency — both total orders — and let the client compute
  -- "closing soon" from the deadlines it can actually parse.
  ORDER BY p.featured DESC, p.created_at DESC
  -- Clamped: a caller passing 10000 still gets at most 5 rows, and a caller
  -- passing 0 or a negative still gets a usable teaser rather than an empty one.
  LIMIT LEAST(GREATEST(COALESCE(_limit, 3), 1), 5);
$$;

COMMENT ON FUNCTION public.funding_teaser(INT) IS
  'Member-safe preview of published funding opportunities for signed-in non-members. '
  'Returns advertising columns only (title, funder, type, deadline) plus the total '
  'published count. Never returns url/summary/eligibility/amount/details.';

-- The function owner must not be exploitable via a permissive default grant.
REVOKE ALL ON FUNCTION public.funding_teaser(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.funding_teaser(INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.funding_teaser(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.funding_teaser(INT) TO service_role;
