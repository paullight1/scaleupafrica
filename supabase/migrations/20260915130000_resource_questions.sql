-- Per-resource access questions. The JSON shape is intentionally small so
-- admins can configure questions without a second editor workflow; responses
-- are stored in the existing resource lead metadata.
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS additional_questions JSONB NOT NULL DEFAULT '[
    {"id":"company_name","label":"Company name","type":"text","options":[],"required":true,"enabled":true},
    {"id":"employee_range","label":"Number of employees","type":"select","options":["1–5","6–10","11–20","21–50","51–100","101+"],"required":true,"enabled":true},
    {"id":"hear_about_us","label":"How did you hear about us?","type":"select","options":["Instagram","WhatsApp","LinkedIn","Email","Through a friend"],"required":true,"enabled":true},
    {"id":"country","label":"Which country do you reside in?","type":"text","options":[],"required":true,"enabled":true}
  ]'::jsonb;

CREATE INDEX IF NOT EXISTS leads_resource_id_idx ON public.leads (resource_id);
