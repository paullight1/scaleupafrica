-- Grant the verified Cresciva staff account its explicit RBAC role.
-- Email-domain checks in the AdminPanel are UX only; RLS continues to rely on
-- public.user_roles through public.is_admin()/public.is_staff().
do $$
declare
  granted_user_id uuid;
begin
  select id
    into granted_user_id
  from auth.users
  where lower(email) = lower('tech@crescivacapital.com')
    and email_confirmed_at is not null;

  if granted_user_id is null then
    raise exception 'Verified Cresciva staff account was not found';
  end if;

  insert into public.user_roles (user_id, role)
  values (granted_user_id, 'admin'::public.app_role)
  on conflict (user_id, role) do nothing;
end
$$;
