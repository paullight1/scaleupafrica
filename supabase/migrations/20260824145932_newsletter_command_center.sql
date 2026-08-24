-- Brevo-backed newsletter command center. Supabase remains authoritative for
-- consent, campaign drafts/snapshots and normalized provider events.

alter table public.newsletter_subscribers
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists subscribed_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_reason text,
  add column if not exists consent_source text,
  add column if not exists brevo_contact_id bigint,
  add column if not exists brevo_sync_status text not null default 'pending',
  add column if not exists brevo_synced_at timestamptz,
  add column if not exists brevo_sync_error text;

update public.newsletter_subscribers
set
  subscribed_at = case when status = 'subscribed' then coalesce(subscribed_at, created_at) else subscribed_at end,
  unsubscribed_at = case when status = 'unsubscribed' then coalesce(unsubscribed_at, created_at) else unsubscribed_at end,
  consent_source = coalesce(nullif(consent_source, ''), nullif(source, ''), 'legacy');

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_brevo_sync_status_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_brevo_sync_status_check
  check (brevo_sync_status in ('pending', 'synced', 'failed', 'suppressed'));

create index if not exists newsletter_subscribers_email_lower_idx
  on public.newsletter_subscribers (lower(email));
create index if not exists newsletter_subscribers_status_created_idx
  on public.newsletter_subscribers (status, created_at desc);
create index if not exists newsletter_subscribers_sync_status_idx
  on public.newsletter_subscribers (brevo_sync_status, updated_at)
  where brevo_sync_status in ('pending', 'failed');

drop trigger if exists newsletter_subscribers_set_updated_at on public.newsletter_subscribers;
create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.tg_set_updated_at();

create table public.newsletter_consent_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  event_type text not null
    check (event_type in ('subscribed', 'unsubscribed', 'resubscribed', 'hard_bounced', 'complained', 'admin_added')),
  source text,
  reason text,
  actor_user_id uuid references auth.users(id) on delete set null,
  provider_event_id text,
  created_at timestamptz not null default now()
);

create index newsletter_consent_events_subscriber_time_idx
  on public.newsletter_consent_events (subscriber_id, created_at desc);
create index newsletter_consent_events_email_time_idx
  on public.newsletter_consent_events (lower(email), created_at desc);

alter table public.newsletter_consent_events enable row level security;
grant select on public.newsletter_consent_events to authenticated;
grant all on public.newsletter_consent_events to service_role;
revoke all on public.newsletter_consent_events from anon;

create policy newsletter_consent_events_admin_select
  on public.newsletter_consent_events for select to authenticated
  using ((select public.is_admin(auth.uid())));

create or replace function public.newsletter_record_subscriber_consent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  next_event text;
begin
  if tg_op = 'INSERT' then
    next_event := 'subscribed';
  elsif old.status is distinct from new.status then
    next_event := case when new.status = 'subscribed' then 'resubscribed' else 'unsubscribed' end;
  else
    return new;
  end if;

  insert into public.newsletter_consent_events (
    subscriber_id, email, event_type, source, reason, actor_user_id
  ) values (
    new.id,
    lower(new.email),
    next_event,
    coalesce(new.consent_source, new.source),
    new.unsubscribe_reason,
    auth.uid()
  );
  return new;
end;
$$;

revoke all on function public.newsletter_record_subscriber_consent() from public, anon, authenticated;

drop trigger if exists newsletter_subscribers_record_consent on public.newsletter_subscribers;
create trigger newsletter_subscribers_record_consent
  after insert or update of status on public.newsletter_subscribers
  for each row execute function public.newsletter_record_subscriber_consent();

create table public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled', 'archived')),
  revision integer not null default 1 check (revision > 0),
  internal_name text not null check (char_length(internal_name) between 1 and 160),
  subject text not null check (char_length(subject) between 1 and 200),
  preview_text text not null default '' check (char_length(preview_text) <= 240),
  sender_name text not null check (char_length(sender_name) between 1 and 120),
  sender_email text not null check (char_length(sender_email) between 3 and 254),
  reply_to text not null check (char_length(reply_to) between 3 and 254),
  content_blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(content_blocks) = 'array'),
  rendered_html text not null default '',
  rendered_text text not null default '',
  audience_filter jsonb not null default '{"mode":"all"}'::jsonb check (jsonb_typeof(audience_filter) = 'object'),
  estimated_recipient_count integer check (estimated_recipient_count >= 0),
  final_recipient_count integer check (final_recipient_count >= 0),
  brevo_campaign_id bigint unique,
  brevo_audience_list_id bigint,
  last_test_email text,
  last_test_revision integer,
  last_test_status text check (last_test_status is null or last_test_status in ('sent', 'failed')),
  last_tested_at timestamptz,
  scheduled_at timestamptz,
  sending_started_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  provider_error text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index newsletter_campaigns_status_schedule_idx
  on public.newsletter_campaigns (status, scheduled_at, created_at desc);

alter table public.newsletter_campaigns enable row level security;
grant select on public.newsletter_campaigns to authenticated;
grant all on public.newsletter_campaigns to service_role;
revoke all on public.newsletter_campaigns from anon;

create policy newsletter_campaigns_admin_select
  on public.newsletter_campaigns for select to authenticated
  using ((select public.is_admin(auth.uid())));
create policy newsletter_campaigns_admin_insert
  on public.newsletter_campaigns for insert to authenticated
  with check ((select public.is_admin(auth.uid())));
create policy newsletter_campaigns_admin_update
  on public.newsletter_campaigns for update to authenticated
  using ((select public.is_admin(auth.uid())))
  with check ((select public.is_admin(auth.uid())));

create or replace function public.newsletter_guard_campaign_immutability()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.status <> 'draft' and (
    new.revision is distinct from old.revision or
    new.internal_name is distinct from old.internal_name or
    new.subject is distinct from old.subject or
    new.preview_text is distinct from old.preview_text or
    new.sender_name is distinct from old.sender_name or
    new.sender_email is distinct from old.sender_email or
    new.reply_to is distinct from old.reply_to or
    new.content_blocks is distinct from old.content_blocks or
    new.rendered_html is distinct from old.rendered_html or
    new.rendered_text is distinct from old.rendered_text or
    new.audience_filter is distinct from old.audience_filter or
    new.scheduled_at is distinct from old.scheduled_at
  ) then
    raise exception 'Sent campaigns are immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.newsletter_guard_campaign_immutability() from public, anon, authenticated;

create trigger newsletter_campaigns_guard_immutability
  before update on public.newsletter_campaigns
  for each row execute function public.newsletter_guard_campaign_immutability();
create trigger newsletter_campaigns_set_updated_at
  before update on public.newsletter_campaigns
  for each row execute function public.tg_set_updated_at();

create table public.newsletter_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  source text,
  consented_at timestamptz,
  brevo_contact_id bigint,
  state text not null default 'eligible'
    check (state in ('eligible', 'excluded', 'submitted', 'delivered', 'bounced', 'complained', 'unsubscribed')),
  exclusion_reason text,
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);

create index newsletter_campaign_recipients_campaign_state_idx
  on public.newsletter_campaign_recipients (campaign_id, state);

alter table public.newsletter_campaign_recipients enable row level security;
grant select on public.newsletter_campaign_recipients to authenticated;
grant all on public.newsletter_campaign_recipients to service_role;
revoke all on public.newsletter_campaign_recipients from anon;
create policy newsletter_campaign_recipients_admin_select
  on public.newsletter_campaign_recipients for select to authenticated
  using ((select public.is_admin(auth.uid())));

create table public.newsletter_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.newsletter_campaigns(id) on delete set null,
  provider_event_key text not null unique,
  provider_event_id text,
  provider_campaign_id bigint,
  recipient_email text not null,
  event_type text not null
    check (event_type in ('sent', 'delivered', 'opened', 'clicked', 'soft_bounced', 'hard_bounced', 'complained', 'unsubscribed', 'contact_updated', 'contact_deleted')),
  event_at timestamptz not null,
  clicked_url text,
  reason text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index newsletter_campaign_events_campaign_time_idx
  on public.newsletter_campaign_events (campaign_id, event_at desc);
create index newsletter_campaign_events_provider_campaign_idx
  on public.newsletter_campaign_events (provider_campaign_id, event_at desc);
create index newsletter_campaign_events_email_time_idx
  on public.newsletter_campaign_events (lower(recipient_email), event_at desc);

alter table public.newsletter_campaign_events enable row level security;
grant select on public.newsletter_campaign_events to authenticated;
grant all on public.newsletter_campaign_events to service_role;
revoke all on public.newsletter_campaign_events from anon;
create policy newsletter_campaign_events_admin_select
  on public.newsletter_campaign_events for select to authenticated
  using ((select public.is_admin(auth.uid())));

create table public.newsletter_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.newsletter_subscribers(id) on delete cascade,
  operation text not null check (operation in ('upsert', 'unsubscribe', 'resync')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index newsletter_sync_jobs_pending_idx
  on public.newsletter_sync_jobs (next_attempt_at, created_at)
  where status in ('queued', 'failed');
create unique index newsletter_sync_jobs_active_subscriber_operation_idx
  on public.newsletter_sync_jobs (subscriber_id, operation)
  where status in ('queued', 'running');

alter table public.newsletter_sync_jobs enable row level security;
grant select on public.newsletter_sync_jobs to authenticated;
grant all on public.newsletter_sync_jobs to service_role;
revoke all on public.newsletter_sync_jobs from anon;
create policy newsletter_sync_jobs_admin_select
  on public.newsletter_sync_jobs for select to authenticated
  using ((select public.is_admin(auth.uid())));

create trigger newsletter_sync_jobs_set_updated_at
  before update on public.newsletter_sync_jobs
  for each row execute function public.tg_set_updated_at();

create or replace function public.newsletter_queue_subscriber_sync()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.newsletter_sync_jobs (subscriber_id, operation)
  select
    new.id,
    case when new.status = 'subscribed' then 'upsert' else 'unsubscribe' end
  where not exists (
    select 1
    from public.newsletter_sync_jobs existing
    where existing.subscriber_id = new.id
      and existing.operation = case when new.status = 'subscribed' then 'upsert' else 'unsubscribe' end
      and existing.status in ('queued', 'running')
  );
  return new;
end;
$$;

revoke all on function public.newsletter_queue_subscriber_sync() from public, anon, authenticated;

drop trigger if exists newsletter_subscribers_queue_sync on public.newsletter_subscribers;
create trigger newsletter_subscribers_queue_sync
  after insert or update of status on public.newsletter_subscribers
  for each row execute function public.newsletter_queue_subscriber_sync();
