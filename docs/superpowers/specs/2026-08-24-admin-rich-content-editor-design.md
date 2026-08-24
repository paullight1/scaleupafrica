# Admin Rich Content Editor and Resource CMS Design

**Date:** 2026-08-24

## Goal

Replace the Blog and Resources Markdown textareas in `AdminPanel` with a reusable Word/Google Docs-style rich-text workspace. Published content must remain unchanged while staff prepare edits, and publication must be an explicit administrator action. The existing Advisor's Playbook public resource must move from a frontend constant into Supabase so administrators can edit it like every other resource.

This is a visual rich-text editor, not a collaborative document service. It includes structured formatting, inline media, tables, previews, keyboard shortcuts, and dependable autosave. It does not include simultaneous cursors, comments, suggestions, or revision history.

## Experience principles

- Writing is the primary task, so the document canvas receives most of the screen.
- Formatting controls behave consistently across Blog posts and Resources.
- Autosave protects work but never publishes it.
- The public site changes only when an authorized administrator chooses **Publish** or **Publish update**.
- Public previews use the same renderer and content styles as the live pages.
- Existing Markdown content remains readable throughout the migration.
- Resource delivery supports both uploaded files and editable external URLs such as Google Slides.

## Content architecture

Tiptap/ProseMirror JSON is the canonical format for new rich content. The published `blog_posts` and `resources` tables each gain a nullable `content_json jsonb` column. Their existing `content` Markdown columns remain available as a compatibility fallback during migration.

Working copies live outside the public tables:

### `blog_post_drafts`

- `post_id uuid primary key references blog_posts(id) on delete cascade`
- `payload jsonb not null`
- `updated_at timestamptz not null default now()`
- `updated_by uuid references auth.users(id)`

### `resource_drafts`

- `resource_id uuid primary key references resources(id) on delete cascade`
- `payload jsonb not null`
- `updated_at timestamptz not null default now()`
- `updated_by uuid references auth.users(id)`

Each payload is a complete editable snapshot, not merely the document body. It includes the rich document and all mutable metadata for that content type. This prevents title, slug, excerpt, cover, SEO, access, or resource-delivery edits from reaching the live site before publication.

Draft tables have staff-only row-level security and no anonymous/public grants. Keeping drafts in separate tables prevents a caller from requesting unpublished fields from an otherwise public, published row. Editors may create and update working drafts for draft or published content without modifying the public record. Administrators may do the same and may publish them. This intentionally extends the current editor rule: editors still cannot alter a published row, but they can now prepare its next private version.

New content begins with a base row whose status is `draft`, title is `Untitled`, and slug is a generated `draft-<uuid>` value, plus its private draft snapshot. The generated values satisfy current non-null and uniqueness constraints but are never publishable placeholders. Admin list queries combine the base record with its working draft for display. A published record continues serving its last published snapshot while a separate working draft exists.

This release retains one current working copy per item. Audit events record creates, publications, unpublishes, archives, and other privileged actions; autosave keystrokes do not produce audit-log noise.

## Publication boundary

Dedicated database functions publish Blog and Resource drafts atomically. Each function:

1. verifies the caller is an administrator using the existing role helpers;
2. locks or otherwise protects the target row during the update;
3. loads the corresponding private draft;
4. validates required fields, slug uniqueness, document structure, and resource-delivery requirements;
5. copies the complete snapshot into the public table, including `content_json`;
6. sets the correct status and publication timestamps;
7. removes the applied private draft; and
8. returns the updated public row.

The functions fix their `search_path`, revoke execution from `PUBLIC` and anonymous users, and retain internal authorization checks even when invoked by an authenticated client. A failed validation or write leaves both the published row and working draft intact.

For an unpublished item, **Publish** creates its first public snapshot. For an already-published item with changes, the action is labelled **Publish update**. **Save draft** and autosave never call the publication function. Unpublish/archive/delete continue to use the existing administrator-only workflow and confirmation rules.

## Rich-text document model

The shared schema supports:

- paragraphs and headings levels 1–4;
- bold, italic, underline, strike, inline code, highlight, and links;
- ordered, unordered, and task lists;
- blockquotes, code blocks, horizontal rules, and hard breaks;
- left, center, and right alignment where appropriate;
- tables with header rows and editable cells;
- inline images with alt text, captions, and stored source URLs;
- undo, redo, and standard keyboard shortcuts.

The same extension set is used by the Admin editor and public read-only renderer. The renderer never executes arbitrary HTML and does not depend on `dangerouslySetInnerHTML` for user-authored content. Unsupported or malformed nodes produce a controlled fallback instead of breaking the entire page.

When an existing record has Markdown but no `content_json`, the editor initializes a rich document from the legacy content. That conversion is saved into the private draft, leaving the published Markdown untouched until the administrator publishes the rich update. Public pages prefer valid `content_json` and otherwise render the existing Markdown exactly as they do today.

## Shared editor workspace

The rich-document schema, validation helpers, and `RichContentRenderer` live in `Shared` so Admin preview and public Blog/Resource pages cannot drift. The editing workspace remains owned by `AdminPanel`. The current large Blog and Resource edit pages are split into focused units:

- `RichTextEditor` owns Tiptap initialization, commands, keyboard behavior, and editable document state.
- `RichTextToolbar` groups text style, insert, structure, and history commands in a sticky toolbar.
- `ContentCanvas` provides a centered, paper-like writing surface with readable line length and responsive behavior.
- `AutosaveStatus` reports **Saving**, **Saved at …**, **Offline**, or **Retry** without blocking typing.
- `ContentPreview` renders the working snapshot through the shared public renderer and public content styles.
- type-specific inspector panels own publishing, taxonomy, SEO, cover media, and resource-delivery fields.

The toolbar remains visible while the body scrolls. The editor provides a focused writing mode on smaller screens, while metadata moves beneath the document or into a controlled inspector drawer. All toolbar commands have accessible names, keyboard focus styles, and selected states.

Autosave is debounced after approximately 1.5 seconds of inactivity. Only changed snapshots are sent. Saving is serialized so a slower earlier request cannot overwrite a newer document. A failed save preserves local content, displays retry state, and retries only after user input, reconnection, or an explicit retry. Navigation warns when the latest local version has not reached the server.

Inline images upload to the existing `content-media` storage bucket before their nodes are inserted. Failed or cancelled uploads do not create broken document nodes. Cover images remain separate content metadata. Resource downloads continue using `resource-files`.

## Blog administration

The Blog list keeps search and status filtering while adding a **Draft changes** indicator and the latest autosave time. Published status and working-draft status are displayed separately so staff can distinguish a live article from pending edits.

The Blog editor places title, excerpt, and the document canvas in the main column. Its inspector contains:

- publication status and actions;
- cover image;
- slug;
- category and tags;
- author and read time;
- featured state;
- SEO title and description.

Preview renders the complete private snapshot, including draft metadata and cover media, without changing the public row. Publishing validates title, unique slug, excerpt, non-empty document, author, category, and any existing required public fields.

## Resource administration

The Resources list uses the same search, status, working-draft, and publication conventions as Blog. It additionally surfaces type, category, access level, featured state, and the existing engagement metrics.

The Resource editor reuses the document workspace and provides an inspector for:

- resource type and category;
- topics;
- author and estimated read time;
- cover image;
- gated/public and featured settings;
- SEO metadata where supported;
- delivery method.

Delivery method explicitly supports either an uploaded file or an external URL. Staff can upload or replace a file through `resource-files`, or enter and edit a URL such as a Google Slides presentation. The selected delivery method determines the relevant validation and public action label. Changing the method does not delete an old uploaded object automatically.

## Advisor's Playbook migration

An idempotent database migration inserts the existing Advisor's Playbook using the stable slug `the-advisors-playbook`. It carries over its current title, excerpt, category, topics, author, featured and gated flags, read time, Google Slides URL, and article body.

The migration uses insert-on-conflict-do-nothing behavior so it cannot overwrite a database record that staff have already edited. Once the database-backed item is available, the public Resource queries stop merging `Frontend/src/content/hardcodedResources.ts` into Supabase results. The hardcoded constant is removed, and Supabase errors are surfaced through the existing query error experience instead of silently substituting stale content.

The seeded resource is visible in Admin Resources and follows the same private-draft and explicit-publication workflow as other resources. Its Google Slides URL remains editable as an external delivery URL.

## Public rendering and data flow

Public Blog and Resource queries continue selecting only published rows and explicit public columns. Detail pages select `content_json` in addition to legacy `content`.

The rendering order is:

1. validate and render `content_json` with the read-only rich-content renderer;
2. if rich content is absent or invalid, render legacy Markdown;
3. if neither format contains usable content, show the existing controlled empty state.

Admin preview receives the private snapshot directly and never makes it publicly addressable. Query invalidation after publication refreshes Admin lists, Admin details, public lists, public details, featured Resources, related content, and dashboard counts that depend on content status.

## Validation and error handling

- Slug collisions are mapped to the slug field rather than shown only as a generic toast.
- Invalid or empty rich documents block publication but not draft saving.
- Autosave failures preserve the in-memory document and provide retry state.
- Publication failures preserve the private working draft and the previous live version.
- Upload failures leave the rest of the draft untouched.
- External URLs must use `https` and pass URL validation before publication.
- A gated resource must have a valid delivery target before publication.
- Malformed legacy content falls back safely and remains repairable from Admin.
- Stale saves are serialized client-side; the latest successfully acknowledged snapshot is the one reported as saved.

## Security

- Draft RLS is verified separately for administrator, editor, authenticated member, and anonymous identities.
- Anonymous and ordinary authenticated users cannot select, insert, update, or delete working drafts.
- Editors cannot invoke publish functions or change publication status directly.
- Publication functions self-check administrator authorization and are not executable by anonymous users.
- Public queries use explicit column lists and never join private draft tables.
- Rich documents use a fixed supported-node schema; raw scripts, event attributes, iframes, and arbitrary HTML are not accepted.
- Storage policies remain staff-write, while public delivery follows the existing bucket and resource-access rules.

## Testing and verification

Database coverage proves:

- draft rows are invisible to public and member identities;
- editors can autosave permitted drafts but cannot publish;
- administrators can publish atomically;
- validation failures leave the live row and private draft unchanged;
- published edits remain private until **Publish update**;
- the Advisor's Playbook seed is idempotent and does not overwrite an existing row.

AdminPanel coverage proves:

- toolbar commands and keyboard shortcuts update structured content;
- Blog and Resource forms autosave complete snapshots;
- save-state transitions and retry behavior are accurate;
- navigation protects unsent work;
- list rows distinguish published state from draft changes;
- preview uses draft metadata and document content;
- publish controls follow administrator/editor permissions;
- uploaded and external Resource delivery methods validate correctly.

Frontend coverage proves:

- rich JSON renders on Blog and Resource detail pages;
- legacy Markdown remains supported;
- invalid JSON falls back safely;
- Advisor's Playbook loads from Supabase without a hardcoded merge;
- public list, featured, related, gated, and delivery behavior does not regress.

Delivery verification runs relevant AdminPanel, Frontend, Shared, and Supabase tests; typechecks; lint checks; production builds; and a browser smoke test covering Blog draft autosave, Resource external-link editing, administrator publication, and public rendering.

## Delivery boundaries

This phase does not add collaborative cursors, comments, suggestions, version history, scheduled publishing, AI writing, arbitrary embeds, or a third-party CMS. It does not redesign unrelated AdminPanel areas. Existing unrelated worktree changes are preserved and excluded from this feature's commits.
