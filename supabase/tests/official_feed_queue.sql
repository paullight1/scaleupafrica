BEGIN;
DO $$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
BEGIN
 IF has_function_privilege('authenticated','public.queue_official_feed_discoveries()','EXECUTE') THEN RAISE EXCEPTION 'Public queue execution'; END IF;
 INSERT INTO funding_opportunities(id,title,funder,url,details) VALUES
 (a,'Rollback-only call','Fixture','https://idrc-crdi.ca/test-grant', '{"discovery_importer":"free_rss_v1","feed_url":"https://idrc-crdi.ca/en/rss.xml"}'),
 (b,'Edited call','Fixture','https://idrc-crdi.ca/test-edited', '{"discovery_importer":"free_rss_v1","feed_url":"https://idrc-crdi.ca/en/rss.xml"}'),
 (c,'Wrong host','Fixture','https://idrc-crdi.ca.evil.example/test', '{"discovery_importer":"free_rss_v1","feed_url":"https://idrc-crdi.ca/en/rss.xml"}');
 UPDATE funding_opportunities SET created_at=created_at-interval '1 minute' WHERE id=b;
 PERFORM queue_official_feed_discoveries();
 IF NOT EXISTS(SELECT 1 FROM funding_opportunities WHERE id=a AND source_url=url AND verification_status='unverified' AND application_status='unknown') THEN RAISE EXCEPTION 'First party not queued safely'; END IF;
 IF EXISTS(SELECT 1 FROM funding_opportunities WHERE id IN(b,c) AND source_url IS NOT NULL) THEN RAISE EXCEPTION 'Editorial or origin boundary bypass'; END IF;
END $$;
ROLLBACK;
