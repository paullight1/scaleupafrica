begin;

select plan(4);

select is(
  (
    select count(*)::integer
    from public.blog_posts
    where slug = any (array[
      'identify-your-ideal-customers',
      'coauthor-mvp-launch-review',
      'common-marketing-mistakes-customer-retention',
      'implement-product-led-growth-strategies',
      'product-led-growth-vs-sales-led-marketing',
      'understanding-product-led-growth-marketing',
      'most-respected-facilities-management-company-nigeria'
    ])
  ),
  7,
  'the seven unique LinkedIn articles are seeded'
);

select is(
  (
    select count(*)::integer
    from public.blog_posts
    where slug = any (array[
      'identify-your-ideal-customers',
      'coauthor-mvp-launch-review',
      'common-marketing-mistakes-customer-retention',
      'implement-product-led-growth-strategies',
      'product-led-growth-vs-sales-led-marketing',
      'understanding-product-led-growth-marketing',
      'most-respected-facilities-management-company-nigeria'
    ])
      and status = 'published'
      and author_name = 'Belinda Nkechi Idinmachi'
  ),
  7,
  'every imported article is published with its LinkedIn author'
);

select is(
  (
    select count(*)::integer
    from public.blog_posts
    where slug = any (array[
      'identify-your-ideal-customers',
      'coauthor-mvp-launch-review',
      'common-marketing-mistakes-customer-retention',
      'implement-product-led-growth-strategies',
      'product-led-growth-vs-sales-led-marketing',
      'understanding-product-led-growth-marketing',
      'most-respected-facilities-management-company-nigeria'
    ])
      and content like E'%\n\n%'
  ),
  7,
  'every article uses blank lines so Markdown renders paragraph spacing'
);

select is(
  (
    select count(*)::integer
    from public.blog_posts
    where slug = any (array[
      'identify-your-ideal-customers',
      'coauthor-mvp-launch-review',
      'common-marketing-mistakes-customer-retention',
      'implement-product-led-growth-strategies',
      'product-led-growth-vs-sales-led-marketing',
      'understanding-product-led-growth-marketing',
      'most-respected-facilities-management-company-nigeria'
    ])
      and content ~ E'Originally published on LinkedIn.+https://www\\.linkedin\\.com/pulse/'
  ),
  7,
  'every imported article preserves its original LinkedIn source link'
);

select * from finish();

rollback;
