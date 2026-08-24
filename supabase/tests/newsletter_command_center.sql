begin;

select plan(25);

select has_table('public', 'newsletter_consent_events');
select has_table('public', 'newsletter_campaigns');
select has_table('public', 'newsletter_campaign_recipients');
select has_table('public', 'newsletter_campaign_events');
select has_table('public', 'newsletter_sync_jobs');

select has_column('public', 'newsletter_subscribers', 'subscribed_at');
select has_column('public', 'newsletter_subscribers', 'unsubscribed_at');
select has_column('public', 'newsletter_subscribers', 'consent_source');
select has_column('public', 'newsletter_subscribers', 'brevo_contact_id');
select has_column('public', 'newsletter_subscribers', 'brevo_sync_status');
select has_column('public', 'newsletter_subscribers', 'brevo_sync_error');
select has_column('public', 'newsletter_campaigns', 'brevo_audience_list_id');

select has_index('public', 'newsletter_subscribers', 'newsletter_subscribers_status_created_idx');
select has_index('public', 'newsletter_campaigns', 'newsletter_campaigns_status_schedule_idx');
select has_index('public', 'newsletter_sync_jobs', 'newsletter_sync_jobs_pending_idx');
select has_index('public', 'newsletter_campaign_events', 'newsletter_campaign_events_campaign_time_idx');

select has_policy('public', 'newsletter_campaigns', 'newsletter_campaigns_admin_select');
select has_policy('public', 'newsletter_campaigns', 'newsletter_campaigns_admin_insert');
select has_policy('public', 'newsletter_campaigns', 'newsletter_campaigns_admin_update');
select has_policy('public', 'newsletter_consent_events', 'newsletter_consent_events_admin_select');
select has_policy('public', 'newsletter_campaign_events', 'newsletter_campaign_events_admin_select');

select is(
  (select relrowsecurity from pg_class where oid = 'public.newsletter_campaigns'::regclass),
  true,
  'campaigns enforce row-level security'
);

insert into public.newsletter_campaigns (
  internal_name, subject, sender_name, sender_email, reply_to,
  content_blocks, rendered_html, rendered_text, audience_filter, status
) values (
  'August dispatch', 'Fresh funding', 'Cresciva', 'hello@example.com', 'hello@example.com',
  '[]'::jsonb, '<p>Funding</p>', 'Funding', '{"mode":"all"}'::jsonb, 'sent'
);

select throws_ok(
  $$update public.newsletter_campaigns set subject = 'Changed after send' where internal_name = 'August dispatch'$$,
  'P0001',
  'Sent campaigns are immutable',
  'sent campaign content cannot be edited'
);

insert into public.newsletter_campaign_events (
  provider_event_key, provider_event_id, provider_campaign_id, recipient_email,
  event_type, event_at
) values (
  'brevo:campaign:1:event:42', '42', 1, 'founder@example.com', 'delivered', now()
);

select throws_ok(
  $$insert into public.newsletter_campaign_events (provider_event_key, provider_event_id, provider_campaign_id, recipient_email, event_type, event_at) values ('brevo:campaign:1:event:42', '42', 1, 'founder@example.com', 'delivered', now())$$,
  '23505',
  null,
  'provider event identity deduplicates repeated webhook delivery'
);

select function_privs_are(
  'public', 'newsletter_guard_campaign_immutability', array[]::text[],
  'anon', array[]::text[]
);

select * from finish();
rollback;
