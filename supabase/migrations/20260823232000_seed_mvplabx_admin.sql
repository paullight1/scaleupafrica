-- Bootstrap the current project owner after the account has been created.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('mvplabx@gmail.com')
on conflict (user_id, role) do nothing;
