-- Known first-party feeds can enter verification without trusting an aggregator.
INSERT INTO public.funding_sources(name,base_url,source_type) VALUES
 ('IDRC','https://idrc-crdi.ca/','official_funder'),
 ('Adaptation Fund','https://www.adaptation-fund.org/','official_funder')
ON CONFLICT(base_url) DO NOTHING;

CREATE OR REPLACE FUNCTION public.queue_official_feed_discoveries()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE queued integer;
BEGIN
 UPDATE funding_opportunities SET source_url=url
 WHERE source_url IS NULL AND status='published' AND updated_at=created_at
 AND details->>'discovery_importer'='free_rss_v1'
 AND ((details->>'feed_url'='https://idrc-crdi.ca/en/rss.xml' AND url LIKE 'https://idrc-crdi.ca/%')
   OR (details->>'feed_url'='https://www.adaptation-fund.org/feed/' AND url LIKE 'https://www.adaptation-fund.org/%'))
 AND funding_source_is_registered(url);
 GET DIAGNOSTICS queued=ROW_COUNT;
 RETURN queued;
END $$;
REVOKE ALL ON FUNCTION public.queue_official_feed_discoveries() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.queue_official_feed_discoveries() TO service_role;

SELECT cron.schedule('cresciva-free-official-grant-checks','23 * * * *',$job$
 SELECT public.queue_official_feed_discoveries();
 SELECT net.http_post(url:='https://fqragjhmunphhdnmvpgs.supabase.co/functions/v1/free-grant-maintenance',headers:=jsonb_build_object('Content-Type','application/json','X-Cresciva-Discovery-Secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='grant_discovery_secret' LIMIT 1)),body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
