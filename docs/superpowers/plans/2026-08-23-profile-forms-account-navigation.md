# Profile Forms & Account Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix profile form usability, canonical sharing/OAuth URLs, and account navigation so Cresciva members complete and manage their profiles through clear, separate pages.

**Architecture:** Extend the existing React Router + React Hook Form dashboard. Centralize deployed URL behavior in the existing site-origin contract, add small controlled form primitives for currency words, suggestions, countries, and phone numbers, and route account categories as nested dashboard pages.

**Tech Stack:** React 18, TypeScript, React Router 6, React Hook Form, Zod, Vitest, Testing Library, Tailwind CSS, Supabase Auth.

**Spec:** `docs/superpowers/specs/2026-08-23-profile-forms-account-navigation-design.md`

## Global Constraints

- Public deployed/share origin is `https://www.crescivacapital.com`.
- Localhost remains the callback origin for local development.
- Profile form values remain compatible with the existing Supabase `profiles` payload.
- Existing unsaved-change protection and profile-section deep links must continue working.
- Remove all user-facing “shea butter, export, Lagos” examples from profile forms.
- Account membership and password/security settings must render on separate routes/pages.

---

### Task 1: Canonical public origin and OAuth callback contract

**Files:**
- Modify: `config/site-origin.js`
- Create: `Shared/src/lib/authOrigin.ts`
- Create: `Shared/src/lib/authOrigin.test.ts`
- Modify: `Shared/src/hooks/useAuth.tsx`
- Modify: `Frontend/src/lib/dashboard/profileUrl.ts`
- Modify: `Frontend/src/lib/dashboard/__tests__/profileUrl.test.ts`
- Modify: `Shared/src/test/site-origin-contract.test.ts`

**Interfaces:**
- `resolveAuthOrigin(input: { hostname: string; origin: string; siteOrigin: string }): string` returns `origin` for `localhost`/`127.0.0.1`, otherwise `siteOrigin`.
- `publicProfileUrl(profile, origin?)` uses `SITE_ORIGIN` by default and still accepts an explicit origin for tests.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { resolveAuthOrigin } from "./authOrigin";

describe("resolveAuthOrigin", () => {
  it("keeps localhost callbacks local", () => {
    expect(resolveAuthOrigin({ hostname: "localhost", origin: "http://localhost:8080", siteOrigin: "https://www.crescivacapital.com" })).toBe("http://localhost:8080");
  });

  it("uses the canonical production origin for deployed hosts", () => {
    expect(resolveAuthOrigin({ hostname: "app.vercel.app", origin: "https://app.vercel.app", siteOrigin: "https://www.crescivacapital.com" })).toBe("https://www.crescivacapital.com");
  });
});
```

Add an assertion that `DEFAULT_SITE_ORIGIN` is `https://www.crescivacapital.com` and that `publicProfileUrl({ slug: "acme", id: "x" })` uses that origin when `window.location.origin` is not supplied.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --run Shared/src/lib/authOrigin.test.ts Frontend/src/lib/dashboard/__tests__/profileUrl.test.ts Shared/src/test/site-origin-contract.test.ts`

Expected: FAIL because the helper is missing and the production origin is still the Vercel URL.

- [ ] **Step 3: Implement the origin contract**

Change `DEFAULT_SITE_ORIGIN` to `https://www.crescivacapital.com`. Add `resolveAuthOrigin` with localhost/127.0.0.1 detection. In `useAuth.tsx`, build OAuth, magic-link, and reset callbacks from `resolveAuthOrigin({ hostname: window.location.hostname, origin: window.location.origin, siteOrigin: SITE_ORIGIN })`; preserve the existing sanitized `next` query parameter. In `profileUrl.ts`, import `SITE_ORIGIN` and default the URL origin to it rather than the live browser origin.

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run: `npm test -- --run Shared/src/lib/authOrigin.test.ts Frontend/src/lib/dashboard/__tests__/profileUrl.test.ts Shared/src/test/site-origin-contract.test.ts`

Expected: PASS with zero failures.

- [ ] **Step 5: Commit**

```bash
git add config/site-origin.js Shared/src/lib/authOrigin.ts Shared/src/lib/authOrigin.test.ts Shared/src/hooks/useAuth.tsx Frontend/src/lib/dashboard/profileUrl.ts Frontend/src/lib/dashboard/__tests__/profileUrl.test.ts Shared/src/test/site-origin-contract.test.ts
git commit -m "fix: use canonical Cresciva origin for sharing and auth"
```

### Task 2: Currency wording and country/phone data primitives

**Files:**
- Create: `Frontend/src/lib/forms/currencyWords.ts`
- Create: `Frontend/src/lib/forms/currencyWords.test.ts`
- Create: `Frontend/src/lib/directory/countries.ts`
- Create: `Frontend/src/lib/directory/countries.test.ts`
- Create: `Frontend/src/components/forms/CurrencyAmountField.tsx`
- Create: `Frontend/src/components/forms/CountryMultiSelect.tsx`
- Create: `Frontend/src/components/forms/PhoneInput.tsx`
- Create: `Frontend/src/components/forms/CountrySelect.tsx`

**Interfaces:**
- `amountToWords(amount: number, currencyLabel: string): string` returns title-cased English wording for positive whole/decimal amounts, for example `amountToWords(100, "US dollars") === "One hundred US dollars"`.
- `COUNTRY_OPTIONS` contains `{ name, iso2, dialCode, flag }` for every existing African country option except `Other`.
- `CountryMultiSelect` accepts `{ value: string[]; onChange: (next: string[]) => void; maxItems?: number }`.
- `PhoneInput` accepts `{ value: string; onChange: (value: string) => void; id?: string; label: string }` and stores `+<dial code> <national number>`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { amountToWords } from "./currencyWords";

describe("amountToWords", () => {
  it("spells a whole dollar amount", () => {
    expect(amountToWords(100, "US dollars")).toBe("One hundred US dollars");
  });

  it("adds cents for decimal amounts", () => {
    expect(amountToWords(125.5, "US dollars")).toBe("One hundred twenty-five US dollars and fifty cents");
  });
});
```

```ts
import { expect, it } from "vitest";
import { COUNTRY_OPTIONS, countryByName, formatPhoneValue } from "./countries";

it("provides a flag and dial code for Nigeria", () => {
  expect(countryByName("Nigeria")).toMatchObject({ iso2: "NG", dialCode: "+234", flag: "🇳🇬" });
});

it("normalizes a selected country code and local number", () => {
  expect(formatPhoneValue("+234", "08012345678")).toBe("+234 08012345678");
});

it("contains no placeholder country option in the selectable list", () => {
  expect(COUNTRY_OPTIONS.some((country) => country.name === "shea butter")).toBe(false);
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --run Frontend/src/lib/forms/currencyWords.test.ts Frontend/src/lib/directory/countries.test.ts`

Expected: FAIL because the helpers and country data do not exist.

- [ ] **Step 3: Implement minimal helpers and controls**

Implement integer-to-English conversion for 0 through billions, trim trailing zero cents, and return an empty string for null/zero/invalid amounts. Build `COUNTRY_OPTIONS` from explicit ISO2, flag, and dialing-code data. Implement `CountrySelect` as a keyboard-accessible combobox with filtered options, flag, name, and dial code. Implement `CountryMultiSelect` with removable chips and the same search menu. Implement `PhoneInput` with a `CountrySelect` prefix and a controlled national-number input; when the country changes, preserve only the national-number part and emit the normalized combined value.

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run: `npm test -- --run Frontend/src/lib/forms/currencyWords.test.ts Frontend/src/lib/directory/countries.test.ts`

Expected: PASS with zero failures.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/lib/forms Frontend/src/lib/directory/countries.ts Frontend/src/lib/directory/countries.test.ts Frontend/src/components/forms
git commit -m "feat: add funding currency and country form controls"
```

### Task 3: Searchable keywords, currency wording, and contextual profile copy

**Files:**
- Modify: `Frontend/src/components/directory/KeywordInput.tsx`
- Create: `Frontend/src/components/directory/KeywordInput.test.tsx`
- Modify: `Frontend/src/components/dashboard/ProfileFields.tsx`
- Modify: `Frontend/src/lib/directory/options.ts`
- Modify: `Frontend/src/lib/validation/profile.ts`

**Interfaces:**
- `KeywordInput` gains optional `suggestions?: string[]` and `renderToken?: (token: string) => React.ReactNode`; existing Enter/comma/backspace behavior remains.
- `KEYWORD_SUGGESTIONS` contains relevant terms such as `agritech`, `climate resilience`, `women-led`, `export readiness`, `financial inclusion`, `job creation`, `renewable energy`, `supply chain`, `health access`, and `youth employment`.

- [ ] **Step 1: Write the failing tests**

```tsx
it("shows matching keyword suggestions while typing", async () => {
  const user = userEvent.setup();
  render(<KeywordInput value={[]} onChange={vi.fn()} suggestions={["renewable energy", "financial inclusion"]} />);
  await user.type(screen.getByRole("textbox"), "renew");
  expect(screen.getByRole("option", { name: "renewable energy" })).toBeInTheDocument();
});

it("does not include the old generic examples", () => {
  render(<KeywordInput value={[]} onChange={vi.fn()} helpText="Funding keywords" />);
  expect(screen.queryByText(/shea butter|export, Lagos/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --run Frontend/src/components/directory/KeywordInput.test.tsx`

Expected: FAIL because `KeywordInput` has no suggestion menu.

- [ ] **Step 3: Implement the controls in the profile form**

Add filtered suggestions to `KeywordInput` with ArrowUp/ArrowDown, Enter selection, Escape close, and `role="listbox"`/`role="option"`. Use `KEYWORD_SUGGESTIONS` in matching fields, with helper text such as “Add terms funders use to find businesses like yours — for example climate resilience, export readiness, or job creation.” Replace the organisation placeholder with `Social enterprise`, founding year with `2024`, funding target with `25000`, and all remaining generic examples with relevant Cresciva language. Use `CurrencyAmountField` for `funding_target_usd`, `CountryMultiSelect` for `operating_countries`, and `CountrySelect` for the main profile country.

Ensure a suggestion click/keyboard selection adds a chip without submitting the surrounding form, and the country selector stores canonical names matching existing validation/API values.

- [ ] **Step 4: Run the focused test and profile typecheck**

Run: `npm test -- --run Frontend/src/components/directory/KeywordInput.test.tsx`

Run: `npm run typecheck --workspace @cresciva/frontend`

Expected: both commands exit successfully.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/components/directory/KeywordInput.tsx Frontend/src/components/directory/KeywordInput.test.tsx Frontend/src/components/dashboard/ProfileFields.tsx Frontend/src/lib/directory/options.ts Frontend/src/lib/validation/profile.ts
git commit -m "feat: improve profile matching and funding inputs"
```

### Task 4: Separate account categories into full pages

**Files:**
- Create: `Frontend/src/pages/dashboard/DashboardMembership.tsx`
- Create: `Frontend/src/pages/dashboard/DashboardSecurity.tsx`
- Create: `Frontend/src/pages/dashboard/DashboardNotifications.tsx`
- Create: `Frontend/src/pages/dashboard/DashboardData.tsx`
- Modify: `Frontend/src/pages/dashboard/DashboardAccount.tsx`
- Modify: `Frontend/src/pages/dashboard/Dashboard.tsx`
- Modify: `Frontend/src/lib/dashboard/routes.ts`
- Create: `Frontend/src/pages/dashboard/DashboardAccountRoutes.test.tsx`
- Modify: `Frontend/src/pages/dashboard/DashboardAccount.test.tsx`

**Interfaces:**
- Add route constants `DASHBOARD_MEMBERSHIP`, `DASHBOARD_SECURITY`, `DASHBOARD_NOTIFICATIONS`, and `DASHBOARD_DATA`.
- `DashboardAccount` renders only the account category menu/landing page.
- Each category page owns its `PageHeader` and only the cards belonging to that category.

- [ ] **Step 1: Write the failing route tests**

```tsx
it("keeps membership and password settings on separate pages", () => {
  render(<MemoryRouter initialEntries={["/dashboard/account/membership"]}><DashboardAccountRoutes /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /membership/i })).toBeInTheDocument();
  expect(screen.queryByText(/change password/i)).not.toBeInTheDocument();
});

it("renders password/security independently", () => {
  render(<MemoryRouter initialEntries={["/dashboard/account/security"]}><DashboardAccountRoutes /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /security/i })).toBeInTheDocument();
  expect(screen.getByText(/password/i)).toBeInTheDocument();
  expect(screen.queryByText("Billing panel")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --run Frontend/src/pages/dashboard/DashboardAccountRoutes.test.tsx Frontend/src/pages/dashboard/DashboardAccount.test.tsx`

Expected: FAIL because nested account routes and category pages do not exist.

- [ ] **Step 3: Implement the account page split**

Move `BillingPanel` into `DashboardMembership`. Move `SecurityCard` and `MfaCard` into `DashboardSecurity`. Move both notification preference cards into `DashboardNotifications`. Move `DataRightsCard` and `SignOutCard` into `DashboardData`. Make `DashboardAccount` a category menu with cards linking to each route. Add nested routes under `dashboard/account/*`; keep `/dashboard/account` as the menu. When the account landing page sees the legacy `#billing` hash, navigate to `DASHBOARD_MEMBERSHIP#billing` with `replace: true`. Update `DASHBOARD_ACCOUNT_BILLING` to the membership path so payment callbacks land on the correct page.

- [ ] **Step 4: Run account tests and typecheck**

Run: `npm test -- --run Frontend/src/pages/dashboard/DashboardAccountRoutes.test.tsx Frontend/src/pages/dashboard/DashboardAccount.test.tsx`

Run: `npm run typecheck --workspace @cresciva/frontend`

Expected: both commands exit successfully.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/pages/dashboard/DashboardMembership.tsx Frontend/src/pages/dashboard/DashboardSecurity.tsx Frontend/src/pages/dashboard/DashboardNotifications.tsx Frontend/src/pages/dashboard/DashboardData.tsx Frontend/src/pages/dashboard/DashboardAccount.tsx Frontend/src/pages/dashboard/Dashboard.tsx Frontend/src/lib/dashboard/routes.ts Frontend/src/pages/dashboard/DashboardAccountRoutes.test.tsx Frontend/src/pages/dashboard/DashboardAccount.test.tsx
git commit -m "feat: split account settings into separate pages"
```

### Task 5: Verification and regression cleanup

**Files:**
- Modify: any files identified by failing frontend tests or lint output from Tasks 1–4.
- Modify: `Frontend/src/pages/Auth.test.tsx` if callback assertions need the canonical-origin contract.
- Modify: `Frontend/src/pages/dashboard/DashboardProfile.test.tsx` if the existing test suite lacks a profile/share regression test.

- [ ] **Step 1: Search for stale examples and localhost share output**

Run: `rg -n "shea butter|export, Lagos|localhost:8082|window\.location\.origin.*directory|DASHBOARD_ACCOUNT_BILLING" Frontend Shared config docs -g '!**/*.map'`

Expected: no user-facing form example uses the removed wording; only intentional local callback handling and route constant references remain.

- [ ] **Step 2: Run the full frontend verification suite**

Run: `npm run lint --workspace @cresciva/frontend`

Run: `npm run typecheck --workspace @cresciva/frontend`

Run: `npm test --workspace @cresciva/frontend`

Run: `npm run build --workspace @cresciva/frontend`

Expected: each command exits 0 with no test failures, TypeScript errors, lint errors, or build errors.

- [ ] **Step 3: Review the final diff against the spec**

Run: `git diff --check` and `git status --short`.

Confirm the diff covers canonical sharing, OAuth callback handling, currency words, contextual examples, keyword suggestions, country flags/search, phone country codes, and separate account pages without modifying unrelated dirty-worktree files.

- [ ] **Step 4: Commit verification fixes**

```bash
git add Frontend Shared config
git commit -m "test: verify profile and account experience"
```
