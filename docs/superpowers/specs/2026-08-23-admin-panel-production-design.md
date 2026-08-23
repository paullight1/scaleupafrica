# Cresciva Admin Panel Production Design

**Date:** 2026-08-23

## Goal

Turn the existing `AdminPanel` into Cresciva’s production operations console without replacing the working CMS and administrative tools. Administrators must be able to manage Blog posts, Resources, funding, members, payments, and platform operations. Editors may prepare draft content, but only administrators may publish or remove it.

## Existing foundation

The current application already provides:

- Blog and Resource list, create, edit, duplicate, publish, archive, and delete flows;
- funding opportunity, source-health, and report management;
- user, directory-profile, lead, newsletter, payment, settings, and audit pages;
- an operational dashboard backed by Supabase RPCs;
- `admin` and `editor` roles, an authenticated admin shell, MFA-aware access checks, and audit logging.

This project will harden and refine those capabilities rather than introduce another CMS.

## Roles and authorization

### Editor

Editors may:

- open the AdminPanel;
- list Blog posts and Resources;
- create draft Blog posts and Resources;
- edit content that is still a draft;
- preview drafts;
- upload content media needed by drafts.

Editors may not:

- publish, unpublish, archive, restore, duplicate, or delete content;
- modify a row after it has left `draft` status;
- access users, profiles, leads, newsletter administration, payments, settings, audit logs, or administrator analytics;
- assign roles or change security-sensitive configuration.

### Administrator

Administrators retain full access to every existing AdminPanel surface. Only administrators can publish, unpublish, archive, restore, duplicate, or delete Blog posts and Resources.

### Enforcement

React route guards and conditional controls provide the correct user experience, but Supabase remains the authorization boundary.

RLS policies for `blog_posts` and `resources` will enforce:

- public users can read published rows through the existing public policy;
- editors can insert rows only when `status = 'draft'`;
- editors can update only existing draft rows and the resulting row must remain a draft;
- editors cannot delete content;
- administrators can perform all content operations.

Publish-status transitions and destructive operations must remain impossible through a direct Supabase client call by an editor. Storage access remains limited to staff, while row publication controls whether uploaded content is surfaced publicly.

## Information architecture

Keep the existing route families and group navigation by job:

1. **Overview** — Dashboard
2. **Content** — Blog, Resources, Funding, Funding sources, Funding reports
3. **Community** — Directory profiles, Users
4. **Growth** — Leads, Newsletter
5. **Revenue** — Memberships and Payments
6. **System** — Settings, Audit log

Editor navigation contains only Dashboard, Blog, Resources, and the draft-safe content tools they are authorized to use. Administrator-only links are not rendered for editors.

The responsive shell retains the desktop sidebar and mobile sheet. Navigation labels will be shortened where necessary, active states will remain visible, and all tables will provide explicit small-screen fallbacks.

## Content workflows

### Blog

The Blog list supports search and status filters with clear Draft, Published, and Archived states. Each row exposes only actions available to the current role.

The editor supports title, slug, excerpt, Markdown content, cover image, category, tags, author information, read time, featured state, SEO title, SEO description, and preview. Editors receive a single `Save draft` action. Administrators receive `Save draft`, `Publish`, and status-management actions.

### Resources

The Resources list and editor follow the same authorization model. The editor retains resource type, title, slug, description, cover media, downloadable file, access level, metadata, tags, SEO, and status controls.

Publishing validates required public fields and attached files before sending the write. Failure messages remain inline and preserve unsaved form values.

### Review visibility

Draft lists show creator, last editor, and last-updated time when that data is available. The dashboard presents drafts awaiting administrator review. This phase does not add a separate approval-comments subsystem; the draft state is the handoff contract.

## Dashboard and analytics

The administrator dashboard combines four reporting lanes.

### Audience

- total and new users;
- published directory profiles and profile growth;
- newsletter subscribers;
- new and total leads;
- 30-day signup trend.

### Content

- published, draft, and archived Blog posts;
- published, draft, and archived Resources;
- Blog views by post and over time;
- Resource views/downloads by resource and over time;
- top-performing content for the selected period.

### Membership and revenue

- active memberships;
- new memberships by period;
- successful, pending, and failed payments;
- gross confirmed revenue by period and currency;
- membership mix across monthly, quarterly, and annual plans;
- payments that need reconciliation.

Revenue is computed only from verified successful payment ledger rows. Different currencies are never summed into a misleading combined value.

### Operations

- flagged profiles;
- drafts awaiting review;
- stale or unhealthy funding sources;
- funding opportunities requiring verification;
- unresolved payment issues;
- recent administrator activity.

The first release uses Cresciva-owned database events and ledger records. Analytics queries are exposed through self-guarded, administrator-only RPCs. Google Analytics and Search Console are deferred, but dashboard components consume typed result contracts so acquisition sources can be added later.

## Analytics data contracts

Extend the existing `admin_dashboard_stats` and `admin_timeseries` model instead of fetching whole tables into the browser.

Add administrator-only RPCs or extend existing RPCs for:

- summary counters by reporting period;
- content performance rankings;
- revenue totals grouped by currency and plan;
- recent operational attention items.

RPCs must:

- check `is_admin(auth.uid())` internally;
- revoke execution from `PUBLIC` and `anon`;
- grant execution only to authenticated users/service role while retaining the internal administrator check;
- use bounded date ranges and indexed columns;
- return zero/empty collections instead of ambiguous null payloads.

Existing analytics events will be used where their meaning is stable. Missing Blog-view or Resource-download events will be added at the public interaction boundary with deduplication appropriate to the current analytics system.

## Reliability and auditability

- Every create, edit, publish, unpublish, archive, restore, duplicate, delete, moderation, role, and payment action records an audit event.
- Audit writes remain best-effort for non-destructive content edits but production mutations still surface their own database failures.
- Destructive actions require confirmation naming the affected item.
- Query mutations invalidate list, detail, dashboard, and public-content caches consistently.
- Loading states use matching skeletons; empty and error states provide a relevant recovery action.
- Content forms protect unsaved work during navigation.

## Accessibility and responsive behavior

- Desktop tables collapse into labelled content cards or controlled horizontal tables on small screens.
- Primary actions remain visible without horizontal overflow.
- Dialogs and confirmation flows are keyboard accessible and restore focus.
- Form labels, errors, status badges, menu states, and chart summaries remain available to assistive technology.
- Charts include textual values or accessible summaries and never carry the only representation of a metric.
- Buttons and controls meet the existing Cresciva contrast and touch-target conventions.

## Security migration strategy

RLS changes will be additive and tested before old broad staff-write policies are removed. The migration will:

1. create replacement admin/editor policies with distinct names;
2. verify editor draft creation and modification behavior;
3. verify every forbidden transition and destructive operation;
4. drop the legacy broad `is_staff` write policies only after replacements exist;
5. keep public published-content reads unchanged.

Role checks are tested at the database layer with representative admin, editor, authenticated-member, and anonymous identities.

## Testing and verification

Automated coverage includes:

- route and navigation visibility for administrator and editor roles;
- editor draft creation/editing and hidden privileged actions;
- administrator publish, archive, duplicate, restore, and delete flows;
- RLS tests proving editor publish/status escalation/delete attempts fail;
- Blog and Resource validation, media/file handling, and error preservation;
- dashboard RPC authorization and aggregation correctness;
- revenue currency separation and successful-payment-only calculations;
- audit-log creation for privileged mutations;
- responsive list/editor behavior at mobile and desktop breakpoints.

Before delivery, run AdminPanel tests, lint, typecheck, and production build; relevant Supabase database tests; the frontend suite for public Blog/Resource regressions; and a browser smoke test covering login, draft creation, administrator publication, and public visibility.

## Delivery boundaries

This work does not introduce an external CMS, Google Analytics, Search Console, editorial comments, scheduled publishing, or multi-stage approvals. Those remain future extensions after the secured admin/editor workflow and database-backed reporting are operating reliably.
