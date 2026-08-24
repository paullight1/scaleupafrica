-- Administrators own content lifecycle changes. Editors may prepare drafts only.

drop policy if exists "Staff manage posts" on public.blog_posts;
drop policy if exists blog_posts_admin_all on public.blog_posts;
drop policy if exists blog_posts_editor_insert_drafts on public.blog_posts;
drop policy if exists blog_posts_editor_update_drafts on public.blog_posts;

create policy blog_posts_admin_all
  on public.blog_posts for all to authenticated
  using ((select public.is_admin(auth.uid())))
  with check ((select public.is_admin(auth.uid())));

create policy blog_posts_editor_insert_drafts
  on public.blog_posts for insert to authenticated
  with check (
    (select public.is_staff(auth.uid()))
    and not (select public.is_admin(auth.uid()))
    and status = 'draft'
  );

create policy blog_posts_editor_update_drafts
  on public.blog_posts for update to authenticated
  using (
    (select public.is_staff(auth.uid()))
    and not (select public.is_admin(auth.uid()))
    and status = 'draft'
  )
  with check (
    (select public.is_staff(auth.uid()))
    and not (select public.is_admin(auth.uid()))
    and status = 'draft'
  );

drop policy if exists "Staff manage resources" on public.resources;
drop policy if exists resources_admin_all on public.resources;
drop policy if exists resources_editor_insert_drafts on public.resources;
drop policy if exists resources_editor_update_drafts on public.resources;

create policy resources_admin_all
  on public.resources for all to authenticated
  using ((select public.is_admin(auth.uid())))
  with check ((select public.is_admin(auth.uid())));

create policy resources_editor_insert_drafts
  on public.resources for insert to authenticated
  with check (
    (select public.is_staff(auth.uid()))
    and not (select public.is_admin(auth.uid()))
    and status = 'draft'
  );

create policy resources_editor_update_drafts
  on public.resources for update to authenticated
  using (
    (select public.is_staff(auth.uid()))
    and not (select public.is_admin(auth.uid()))
    and status = 'draft'
  )
  with check (
    (select public.is_staff(auth.uid()))
    and not (select public.is_admin(auth.uid()))
    and status = 'draft'
  );
