-- These fields are rendered on the public profile detail page. The profiles
-- table uses column-level anon grants, so newly added columns are private until
-- they are explicitly exposed. Acquisition attribution remains owner-only.
grant select (target_customers, offerings)
  on public.profiles
  to anon;
