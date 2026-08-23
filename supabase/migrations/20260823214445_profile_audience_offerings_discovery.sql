alter table public.profiles
  add column target_customers text,
  add column offerings jsonb not null default '[]'::jsonb,
  add column acquisition_source text,
  add column acquisition_source_other text,
  add constraint profiles_target_customers_length check (target_customers is null or char_length(target_customers) <= 1000),
  add constraint profiles_offerings_array check (jsonb_typeof(offerings) = 'array' and jsonb_array_length(offerings) <= 10),
  add constraint profiles_acquisition_source_check check (acquisition_source is null or acquisition_source in ('linkedin','whatsapp','founders_webinar','instagram','facebook','other')),
  add constraint profiles_acquisition_other_check check (
    (acquisition_source = 'other' and nullif(btrim(acquisition_source_other), '') is not null and char_length(acquisition_source_other) <= 160)
    or (acquisition_source is distinct from 'other' and acquisition_source_other is null)
  );

comment on column public.profiles.acquisition_source is 'Private owner acquisition attribution; exclude from public directory selects.';
