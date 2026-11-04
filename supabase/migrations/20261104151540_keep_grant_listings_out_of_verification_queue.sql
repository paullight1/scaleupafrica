-- Publisher listings are discovery links, not registered authoritative sources.
CREATE OR REPLACE FUNCTION public.import_grant_discoveries(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE inserted_count integer;
BEGIN
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 300 THEN
    RAISE EXCEPTION 'Expected at most 300 discoveries';
  END IF;
  INSERT INTO public.funding_opportunities (
    id, title, funder, type, summary, url, source_url, source_name,
    source_fingerprint, source_retrieved_at, source, status, featured,
    verification_status, application_status, deadline_status, tags, country_focus, details
  )
  SELECT DISTINCT ON (r->>'url')
    md5('cresciva:free_rss_v1:' || (r->>'url'))::uuid,
    left(r->>'title',200), left(r->>'funder',200), r->>'type', left(r->>'summary',1000),
    r->>'url', NULL, r->>'source_name', r->>'source_fingerprint',
    (r->>'source_retrieved_at')::timestamptz, 'manual', 'published', false,
    'unverified', 'unknown', 'unknown',
    ARRAY(SELECT jsonb_array_elements_text(r->'tags')), '{}', r->'details'
  FROM jsonb_array_elements(_rows) r
  WHERE r->>'url' ~ '^https://'
    AND r->'details'->>'discovery_importer' = 'free_rss_v1'
    AND NOT EXISTS (
      SELECT 1 FROM public.funding_opportunities f
      WHERE f.url = r->>'url' OR f.source_url = r->>'url'
    )
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Expire only untouched automatic imports. Staff edits and verified rows stay.
  UPDATE public.funding_opportunities
  SET status = 'archived'
  WHERE details->>'discovery_importer' = 'free_rss_v1'
    AND status = 'published' AND verification_status = 'unverified'
    AND application_status = 'unknown' AND featured = false
    AND updated_at = created_at
    AND (details->>'published_at')::timestamptz < now() - interval '60 days';
  RETURN inserted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.import_grant_discoveries(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_grant_discoveries(jsonb) TO service_role;


UPDATE public.funding_opportunities
SET source_url = NULL
WHERE details->>'discovery_importer' = 'free_rss_v1'
  AND verification_status = 'unverified'
  AND source_url = url;
