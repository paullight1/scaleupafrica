# Profile Audience, Offerings, and Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public audience and linked offerings to business profiles, privately collect acquisition source through the editor and a post-save dialog, and replace user-facing storefront language.

**Architecture:** Extend the existing `profiles` row with one text field, one validated JSON offerings array, and two private acquisition fields. Keep the shared contract authoritative across the backend API and direct Supabase frontend paths, isolate repeatable-offering and discovery-dialog UI into focused components, and render only public fields on directory profiles.

**Tech Stack:** PostgreSQL/Supabase migrations and RLS, TypeScript, Zod, NestJS/Drizzle, React, React Hook Form, TanStack Query, Radix Dialog, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-23-profile-audience-offerings-discovery-design.md`

## Global Constraints

- `target_customers` and `offerings` are public; acquisition fields are owner-only and never included in public selects or contracts.
- Offerings contain `name`, optional `description`, and optional normalized HTTP(S) `url`; maximum 10 entries.
- Acquisition source is `linkedin`, `whatsapp`, `founders_webinar`, `instagram`, `facebook`, or `other`; Other requires detail.
- The popup is optional, session-dismissible, and cannot block profile publication.
- Both direct Supabase and backend API feature-flag paths must behave identically.
- No new dependencies and no new privileged database function or public write policy.
- Preserve unrelated working-tree changes, including the uncommitted membership popup work and local environment files.

---

### Task 1: Canonical profile validation and types

**Files:**
- Modify: `Shared/contracts/profiles.ts`
- Modify: `Backend/test/contracts.spec.ts`
- Modify: `Frontend/src/lib/validation/profile.ts`
- Modify: `Frontend/src/lib/validation/profile.test.ts`

**Interfaces:**
- Produces: `OfferingSchema`, `Offering`, `ACQUISITION_SOURCE_VALUES`, `AcquisitionSource`, and extended `ProfileUpsertSchema`.
- Produces: `ProfileFormValues` fields `target_customers`, `offerings`, `acquisition_source`, and `acquisition_source_other`.

- [ ] **Step 1: Write failing contract tests**

Add literal cases proving valid linked offerings normalize, unsafe URLs fail, 11 offerings fail, `other` without detail fails, and a fixed source clears stale Other detail.

```ts
expect(ProfileUpsertSchema.parse({
  ...base,
  target_customers: "Independent retailers",
  offerings: [{ name: "Inventory setup", description: "Implementation support", url: "example.com/setup" }],
  acquisition_source: "other",
  acquisition_source_other: "A partner network",
}).offerings[0].url).toBe("https://example.com/setup");
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test --workspace Backend -- test/contracts.spec.ts && npm test --workspace Frontend -- src/lib/validation/profile.test.ts`

Expected: failures because the new fields and validation rules do not exist.

- [ ] **Step 3: Implement shared and form schemas**

Define the exact shared types and a `superRefine` rule for Other:

```ts
export const ACQUISITION_SOURCE_VALUES = [
  "linkedin", "whatsapp", "founders_webinar", "instagram", "facebook", "other",
] as const;

export const OfferingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optStr(500),
  url: webUrl(500, "Enter a valid product or service link"),
}).strict();
```

Extend frontend defaults, hydration-compatible types, and `normalizeProfileInput`; remove `acquisition_source_other` unless source is `other`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run the two commands from Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Shared/contracts/profiles.ts Backend/test/contracts.spec.ts Frontend/src/lib/validation/profile.ts Frontend/src/lib/validation/profile.test.ts
git commit -m "feat: validate expanded business profile fields"
```

### Task 2: Database migration and generated types

**Files:**
- Create: migration generated through `supabase migration new profile_audience_offerings_discovery`
- Modify: `Shared/src/integrations/supabase/types.ts`

**Interfaces:**
- Consumes: field names and limits from Task 1.
- Produces: nullable `target_customers`, non-null JSON `offerings`, and private acquisition columns on `public.profiles`.

- [ ] **Step 1: Inspect CLI and create migration shell**

Run: `npx supabase --version`, `npx supabase migration new --help`, then `npx supabase migration new profile_audience_offerings_discovery`.

- [ ] **Step 2: Write migration checks**

Add columns plus checks equivalent to:

```sql
alter table public.profiles
  add column target_customers text,
  add column offerings jsonb not null default '[]'::jsonb,
  add column acquisition_source text,
  add column acquisition_source_other text,
  add constraint profiles_target_customers_length check (char_length(target_customers) <= 1000),
  add constraint profiles_offerings_array check (jsonb_typeof(offerings) = 'array' and jsonb_array_length(offerings) <= 10),
  add constraint profiles_acquisition_source_check check (acquisition_source is null or acquisition_source in ('linkedin','whatsapp','founders_webinar','instagram','facebook','other')),
  add constraint profiles_acquisition_other_check check (
    (acquisition_source = 'other' and nullif(btrim(acquisition_source_other), '') is not null and char_length(acquisition_source_other) <= 160)
    or (acquisition_source is distinct from 'other' and acquisition_source_other is null)
  );
```

- [ ] **Step 3: Update generated database types**

Add all four fields to profile Row/Insert/Update types, using `Json` for offerings and appropriate nullable/optional forms.

- [ ] **Step 4: Verify migration locally**

Run migration validation against the available local Supabase stack. Insert/update a controlled profile fixture inside a transaction, select the four fields, confirm the invalid acquisition and non-array offerings checks reject, then roll back.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations Shared/src/integrations/supabase/types.ts
git commit -m "feat: store profile audience offerings and discovery source"
```

### Task 3: Backend and direct-Supabase data parity

**Files:**
- Modify: `Shared/contracts/profiles.ts`
- Modify: `Backend/src/profiles/profiles.service.ts`
- Modify: `Backend/test/profiles.service.spec.ts`
- Modify: `Frontend/src/hooks/queries/directory.ts`
- Modify: `Frontend/src/hooks/queries/directory.test.ts`

**Interfaces:**
- Consumes: `Offering[]` and `AcquisitionSource` from Task 1.
- Produces: public profile reads with `target_customers` and `offerings`; owner reads/writes with all fields.

- [ ] **Step 1: Write failing privacy and parity tests**

Assert that backend `getBySlug` returns public audience/offerings but no acquisition keys, owner upsert round-trips all fields, direct Supabase public columns omit acquisition fields, and `pickUpsertPayload` retains the four new owner fields.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test --workspace Backend -- test/profiles.service.spec.ts && npm test --workspace Frontend -- src/hooks/queries/directory.test.ts`

- [ ] **Step 3: Extend serializers and explicit columns**

Update shared `ProfileDetail` with only public fields, `OwnProfile` with acquisition fields, backend Drizzle mapping/serialization, frontend `ProfileDetailRow`, `PROFILE_COLUMNS`, and `UPSERT_KEYS`. Keep public selects explicit.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run the commands from Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Shared/contracts/profiles.ts Backend/src/profiles/profiles.service.ts Backend/test/profiles.service.spec.ts Frontend/src/hooks/queries/directory.ts Frontend/src/hooks/queries/directory.test.ts
git commit -m "feat: expose public profile offerings safely"
```

### Task 4: Story editor for audience and offerings

**Files:**
- Create: `Frontend/src/components/dashboard/OfferingsFieldArray.tsx`
- Create: `Frontend/src/components/dashboard/OfferingsFieldArray.test.tsx`
- Modify: `Frontend/src/components/dashboard/ProfileFields.tsx`
- Modify: `Frontend/src/components/dashboard/profileFields.config.ts`
- Modify: `Frontend/src/pages/dashboard/DashboardProfileEdit.tsx`

**Interfaces:**
- Consumes: `ProfileFormValues.offerings` and `target_customers`.
- Produces: accessible repeatable offering rows integrated into the `story` validation section.

- [ ] **Step 1: Write failing interaction test**

Render the real field array under `FormProvider`, add an entry, fill name/description/link, remove it, and assert the form value changes. Assert the 10-entry limit disables or hides Add.

- [ ] **Step 2: Run test and confirm RED**

Run: `npm test --workspace Frontend -- src/components/dashboard/OfferingsFieldArray.test.tsx`

- [ ] **Step 3: Implement the field array**

Use React Hook Form `useFieldArray({ control, name: "offerings" })`, stable field IDs, per-row labels/errors, `append({ name: "", description: "", url: "" })`, and `remove(index)`. Focus the appended name field.

- [ ] **Step 4: Integrate profile story and hydration**

Add “Who do you serve?” after About, then `OfferingsFieldArray`. Add both keys to `SECTION_FIELDS.story`; hydrate the fields from the owner profile with safe defaults.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run the test from Step 2 plus `npm test --workspace Frontend -- src/lib/validation/profile.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/dashboard/OfferingsFieldArray.tsx Frontend/src/components/dashboard/OfferingsFieldArray.test.tsx Frontend/src/components/dashboard/ProfileFields.tsx Frontend/src/components/dashboard/profileFields.config.ts Frontend/src/pages/dashboard/DashboardProfileEdit.tsx
git commit -m "feat: let businesses describe audience and offerings"
```

### Task 5: Private discovery field and post-save dialog

**Files:**
- Create: `Frontend/src/components/dashboard/AcquisitionSourceFields.tsx`
- Create: `Frontend/src/components/dashboard/ProfileDiscoveryDialog.tsx`
- Create: `Frontend/src/components/dashboard/ProfileDiscoveryDialog.test.tsx`
- Modify: `Frontend/src/components/dashboard/ProfileFields.tsx`
- Modify: `Frontend/src/components/dashboard/profileFields.config.ts`
- Modify: `Frontend/src/pages/dashboard/DashboardProfileEdit.tsx`

**Interfaces:**
- Consumes: acquisition source types from Task 1 and `useSaveProfile` from Task 3.
- Produces: reusable choice controls and optional post-save dialog with session key `cresciva:profile-discovery-dismissed`.

- [ ] **Step 1: Write failing dialog tests**

Prove unanswered users see six choices after successful save, Other reveals required detail, Save sends only acquisition fields plus authenticated ownership through the existing mutation, answered users do not see it, and Not now sets the session dismissal.

- [ ] **Step 2: Run test and confirm RED**

Run: `npm test --workspace Frontend -- src/components/dashboard/ProfileDiscoveryDialog.test.tsx`

- [ ] **Step 3: Implement reusable choices and dialog**

Create a controlled `AcquisitionSourceFields` component with radio inputs and conditional Other input. Build the Radix dialog with Save answer and Not now; on failed mutation keep it open and show a toast.

- [ ] **Step 4: Integrate editor and post-save flow**

Render the private discovery card last in Contact & links. Hydrate both fields. After the main save succeeds, navigate normally but carry state that requests the optional dialog; render it on the destination profile dashboard only when unanswered and not session-dismissed. Do not couple main publication success to the optional second mutation.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run the test from Step 2 and relevant dashboard profile tests discovered with `rg --files Frontend/src | rg 'DashboardProfile.*test'`.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/dashboard/AcquisitionSourceFields.tsx Frontend/src/components/dashboard/ProfileDiscoveryDialog.tsx Frontend/src/components/dashboard/ProfileDiscoveryDialog.test.tsx Frontend/src/components/dashboard/ProfileFields.tsx Frontend/src/components/dashboard/profileFields.config.ts Frontend/src/pages/dashboard/DashboardProfileEdit.tsx Frontend/src/pages/dashboard/DashboardProfile.tsx
git commit -m "feat: collect private profile discovery source"
```

### Task 6: Public audience and offerings presentation

**Files:**
- Create: `Frontend/src/components/directory/ProfileOfferings.tsx`
- Create: `Frontend/src/pages/ProfileDetail.test.tsx`
- Modify: `Frontend/src/pages/ProfileDetail.tsx`

**Interfaces:**
- Consumes: public `target_customers` and `Offering[]` from Task 3.
- Produces: About → Who we serve → Products & services → Links ordering with safe external links.

- [ ] **Step 1: Write failing public rendering tests**

Use a complete public-profile fixture. Assert heading order, paragraph preservation, offering descriptions, safe `target="_blank"` links with `rel="noopener noreferrer"`, omission of unsafe links, and omission of empty sections.

- [ ] **Step 2: Run test and confirm RED**

Run: `npm test --workspace Frontend -- src/pages/ProfileDetail.test.tsx`

- [ ] **Step 3: Implement public sections**

Reuse paragraph splitting for target customers. Build `ProfileOfferings` with semantic sections/articles and `sanitizeUrl` before rendering optional links. Place both sections immediately after About.

- [ ] **Step 4: Run test and confirm GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/components/directory/ProfileOfferings.tsx Frontend/src/pages/ProfileDetail.tsx Frontend/src/pages/ProfileDetail.test.tsx
git commit -m "feat: show audience and offerings on public profiles"
```

### Task 7: Profile terminology cleanup

**Files:**
- Modify: `Frontend/src/pages/dashboard/DashboardProfile.tsx`
- Modify: user-copy sections in `docs/plans/03-user-dashboard.md`
- Modify: `PRODUCT.md`

**Interfaces:**
- Produces: user-facing language based on “your profile,” not “storefront.”

- [ ] **Step 1: Update user-facing copy**

Change “Your public storefront in the directory” to “Your public profile in the directory,” “Your storefront isn't live yet” to “Your profile isn't live yet,” and corresponding product/dashboard plan prose. Leave comments that literally identify storefront artwork unchanged.

- [ ] **Step 2: Verify terminology**

Run: `rg -ni "storefront" Frontend PRODUCT.md docs/plans/03-user-dashboard.md`

Expected: only literal illustration/artwork references remain.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/dashboard/DashboardProfile.tsx PRODUCT.md docs/plans/03-user-dashboard.md
git commit -m "docs: call the directory page a profile"
```

### Task 8: Full verification and handoff

**Files:**
- Modify only files required to correct failures caused by Tasks 1–7.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified implementation ready to push.

- [ ] **Step 1: Run scoped regression suites**

Run all new and modified test files across Shared consumers, Backend, and Frontend. Expected: PASS.

- [ ] **Step 2: Run static checks**

Run workspace typechecks and lint commands from package scripts. Expected: PASS for affected workspaces.

- [ ] **Step 3: Run production build**

Run: `npm run build --workspace Frontend` and the backend build command from its package scripts. Expected: both complete successfully; report existing size warnings without presenting them as failures.

- [ ] **Step 4: Verify database behavior**

Against the available local Supabase stack, confirm an authenticated owner can write/read all four fields, an anonymous public profile select can read only public explicit columns used by the app, and invalid acquisition/offerings values fail checks.

- [ ] **Step 5: Review diff and working tree**

Run `git diff --check`, inspect `git status --short`, and confirm unrelated `.labx`, `.env`, membership popup, or user-owned changes were neither overwritten nor accidentally staged.

- [ ] **Step 6: Commit any verification corrections**

If Step 1–5 required a feature correction, stage its exact reviewed files and commit it as `fix: complete expanded business profiles`. If no correction was required, do not create an empty commit.

Do not push unless the user explicitly requests it for this implementation.
