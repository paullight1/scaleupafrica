begin;

select plan(12);

select has_policy('public', 'blog_posts', 'blog_posts_admin_all');
select has_policy('public', 'blog_posts', 'blog_posts_editor_insert_drafts');
select has_policy('public', 'blog_posts', 'blog_posts_editor_update_drafts');
select has_policy('public', 'resources', 'resources_admin_all');
select has_policy('public', 'resources', 'resources_editor_insert_drafts');
select has_policy('public', 'resources', 'resources_editor_update_drafts');

select is(
  (select cmd from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'blog_posts_admin_all'),
  'ALL',
  'administrators control the complete blog lifecycle'
);
select is(
  (select cmd from pg_policies where schemaname = 'public' and tablename = 'resources' and policyname = 'resources_admin_all'),
  'ALL',
  'administrators control the complete resource lifecycle'
);
select ok(
  (select with_check ilike '%status = ''draft''%' and with_check ilike '%not is_admin%'
     from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'blog_posts_editor_insert_drafts'),
  'blog editors may only insert drafts'
);
select ok(
  (select qual ilike '%status = ''draft''%' and with_check ilike '%status = ''draft''%'
     from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'blog_posts_editor_update_drafts'),
  'blog editors may only update draft rows into drafts'
);
select ok(
  (select with_check ilike '%status = ''draft''%' and with_check ilike '%not is_admin%'
     from pg_policies where schemaname = 'public' and tablename = 'resources' and policyname = 'resources_editor_insert_drafts'),
  'resource editors may only insert drafts'
);
select ok(
  (select qual ilike '%status = ''draft''%' and with_check ilike '%status = ''draft''%'
     from pg_policies where schemaname = 'public' and tablename = 'resources' and policyname = 'resources_editor_update_drafts'),
  'resource editors may only update draft rows into drafts'
);

select * from finish();
rollback;
