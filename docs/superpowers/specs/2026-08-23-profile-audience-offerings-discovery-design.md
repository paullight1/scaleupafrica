# Profile Audience, Offerings, and Discovery Design

Date: 2026-08-23
Status: Approved for implementation planning

## Purpose

Help every Cresciva business profile explain who it serves and what it offers, while privately collecting how the profile owner discovered Cresciva. The change must preserve the current profile editor’s simple mental model and must not expose acquisition analytics on public directory pages.

## Information architecture

The profile remains organized around the business rather than around form-field types:

- **Identity**: business name, founder, location, industry, and imagery.
- **Your story**: one-line summary, About, Who you serve, and Products & services.
- **Matching**: private funding-fit information.
- **Contact & links**: public contact and social links, followed by the private Cresciva discovery question.

On the public profile, the main column renders content in this order:

1. About
2. Who we serve
3. Products & services
4. Links

Empty optional sections are omitted rather than shown as empty cards.

## Data model

Add these columns to `public.profiles` through the project’s existing imperative migration workflow:

- `target_customers text null`
- `offerings jsonb not null default '[]'::jsonb`
- `acquisition_source text null`
- `acquisition_source_other text null`

`target_customers` and `offerings` are public profile content. `acquisition_source` and `acquisition_source_other` are private owner/analytics fields and must not be included in public directory selects or public profile response contracts.

Each offerings array item has this shape:

```ts
{
  name: string;
  description: string;
  url?: string;
}
```

Constraints and validation:

- At most 10 offerings.
- Offering name: required when the entry exists, 1–120 characters.
- Offering description: optional, up to 500 characters.
- Offering URL: optional, HTTP or HTTPS only after normalization, up to 500 characters.
- Target customers: optional, up to 1,000 characters.
- Acquisition source: one of `linkedin`, `whatsapp`, `founders_webinar`, `instagram`, `facebook`, or `other`.
- Acquisition source “Other” detail: required only when `other` is selected, up to 160 characters; otherwise stored as null.

The migration adds database-level checks for the acquisition-source vocabulary and JSON array shape. Application validation remains responsible for per-entry string and URL rules. Existing rows receive an empty offerings array and null values for all other new fields.

## Editor experience

### Your story section

After the existing “About the business” field, add:

- “Who do you serve?” textarea with guidance such as “Describe the customers, organisations, or communities that benefit from what you do.”
- “Products & services” repeatable editor.

The offerings editor begins with no rows and provides “Add a product or service.” Each row contains Name, Description, and Optional link, plus a remove action. New rows are appended. Errors appear beside the affected field. Keyboard focus moves to the new row’s name after adding it.

### Discovery question

At the bottom of “Contact & links,” add a visually separate private card titled “How did you hear about Cresciva?” It clearly states that the answer is private and used to understand which communities help founders find Cresciva.

The choices are:

- LinkedIn
- WhatsApp
- Founders Webinar
- Instagram
- Facebook
- Other

Selecting Other reveals a text field. Saving the profile persists the answer through the same owner-only profile mutation.

## Discovery popup

After a successful profile publication or update, open the discovery dialog only when the saved profile has no acquisition source and the user has not already dismissed it during the current browser session.

The dialog:

- Uses the same six choices as the profile form.
- Reveals the Other detail field conditionally.
- Has “Save answer” and “Not now” actions.
- Never blocks profile publication, navigation, or public visibility.
- Saves only the two acquisition fields through the existing authenticated owner profile endpoint/mutation.
- Closes with Escape, the close control, or “Not now.”
- Records a session-scoped dismissal so it does not repeatedly interrupt the same session. A user who skips can answer later in the profile editor.

No popup appears when the user has already answered the question.

## Public profile presentation

“Who we serve” appears as a text section immediately after About. Paragraph breaks are preserved.

“Products & services” appears next. Each offering is a restrained content row or card with:

- Offering name as its heading.
- Optional description with paragraph spacing preserved.
- Optional safe external link labeled “View product” or “View service,” opening in a new tab with `noopener noreferrer`.

Invalid or unsafe URLs are not rendered as links. Public pages never receive or render acquisition-source fields.

Directory cards continue using the existing one-line description; offerings are not added to cards in this change.

## API and contracts

Update both frontend/Supabase and backend/API paths so feature flags cannot produce different profile behavior:

- Frontend form schema, defaults, hydration, normalization, section validation, and Supabase upsert allow-list.
- Shared owner upsert schema accepts and validates the four new fields.
- Owner response type includes all four fields.
- Public detail type and explicit public select include only `target_customers` and `offerings`.
- Backend profile serialization and update allow-list mirror the shared contracts.
- Generated Supabase database types include the new columns.

All write paths continue to derive ownership from the authenticated user. No new public write policy or privileged function is introduced.

## Terminology

Replace user-facing uses of “storefront” with “your profile” or contextually equivalent profile language. Current targets include the dashboard profile subtitle and empty-state title.

Internal documentation that uses “storefront” as a metaphor should be updated when it describes user-facing copy. Comments naming an actual storefront illustration remain unchanged because they describe the artwork rather than the product concept.

## Error handling and accessibility

- Profile publication remains successful even if the optional popup save fails.
- A popup save failure keeps the dialog open and displays a retryable error/toast without discarding the selection.
- Offerings cannot submit with a blank name once a row has been added.
- All form controls have programmatic labels and inline error associations.
- The repeatable editor supports keyboard-only add, edit, and remove actions.
- The dialog traps focus through the existing Radix dialog implementation and returns focus to the invoking flow on close.

## Testing

Implementation follows test-driven development. Required regression coverage:

- Profile validation accepts normalized valid offerings and rejects blank names, unsafe URLs, excessive lengths, and more than 10 entries.
- Other acquisition source requires detail; fixed sources discard stale Other detail.
- Profile normalization preserves public paragraphs and safely normalizes offering links.
- Profile editor renders the audience and repeatable offerings controls in Your story.
- Adding and removing offerings updates submitted profile data.
- Discovery popup appears only for unanswered profiles after a successful save, can be dismissed for the session, and submits the selected source.
- Public profile renders audience and offerings after About, including safe links, and omits empty sections.
- Public profile queries/contracts do not expose acquisition-source fields.
- Both direct Supabase and backend API profile paths accept and return the appropriate new fields.
- User-facing dashboard copy no longer calls the profile a storefront.

Verification includes focused tests, shared/frontend/backend typechecks and lint where configured, production build, migration validation against the local Supabase stack when available, and a read/write query confirming the new columns and privacy boundary.

## Out of scope

- Product catalogs, inventory, pricing, checkout, or product-level search.
- Separate public pages for individual offerings.
- Acquisition analytics dashboards or campaign attribution.
- Retrofitting directory search to index offerings.
- Making the discovery answer mandatory.
