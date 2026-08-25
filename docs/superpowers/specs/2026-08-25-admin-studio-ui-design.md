# Cresciva Studio Admin UI Design

Date: 2026-08-25

## Goal

Refactor the Cresciva admin panel into a youthful editorial workspace that is exciting to scan and pleasant to read while preserving its existing workflows, permissions, data access, and navy sidebar. The implementation will follow the generated references in `AdminPanel/design-references/` without trying to reproduce incidental image-generation artifacts.

## Visual Direction

The interface is a creative operations studio rather than a generic SaaS dashboard. Its defining traits are:

- a warm, lightly textured cream canvas;
- the existing deep navy sidebar as the fixed visual anchor;
- large editorial page titles paired with compact humanist interface text;
- bold orange, cobalt, and lime accents used to communicate hierarchy and status;
- thin dark borders, selective hard shadows, and less reliance on floating white cards;
- visual content, business identities, and people presented before secondary metadata;
- purposeful motion on page entry and interactive states, disabled when reduced motion is requested.

The UI must remain professional and trustworthy. It will not use gradients, glassmorphism, purple accents, decorative clutter, or color as the only status signal.

## Reference Images

- `AdminPanel/design-references/cresciva-studio-content.png`: Blog and Resources
- `AdminPanel/design-references/cresciva-studio-community.png`: Directory Profiles and Users
- `AdminPanel/design-references/cresciva-studio-finance.png`: Funding and Payments

## Scope

The first implementation pass covers:

- global admin workspace chrome outside the sidebar;
- Blog;
- Resources;
- Directory Profiles;
- Users;
- Funding Opportunities;
- Payments / Finance;
- reusable admin-only page intro, metric strip, toolbar, data panel, identity cell, and status presentation primitives.

Existing nested Funding pages, editors, Dashboard, Inbox, Newsletter, Settings, and Audit Log retain their behavior and receive only safe global canvas/chrome improvements unless they adopt the new primitives explicitly.

## Layout and Components

### Admin shell

The sidebar's navigation groups, dimensions, routes, permissions, and mobile sheet remain intact. Visual changes are limited to refinement: stronger active-state treatment, a compact brand mark, a low-key footer identity panel, and improved top-bar hierarchy. The main canvas becomes warmer and more spacious, with a maximum readable width on very large displays.

### Page introduction

Each priority page receives an admin-only `StudioPageHeader` containing an uppercase desk label, a large expressive title, a short operational description, and right-aligned actions. Titles use page-specific language while remaining clear:

- Blog: Stories worth sharing
- Resources: Tools worth keeping
- Directory Profiles: Meet the people building next
- Users: The community behind Cresciva
- Funding: Money moves, made visible
- Payments: Payments pulse

The original document title and accessible heading remain accurate through SEO metadata and visible supporting labels.

### Metric strip

Priority pages expose only metrics that can be derived from data already loaded on the page. Metric tiles use shared styling but allow page-specific accent colors. No new API or database query is introduced solely for decoration. When the current dataset cannot support a metric, the layout uses explanatory context rather than invented data.

### Toolbars

Search, tabs, and filters are grouped into a single bordered toolbar. Primary filters remain visible; less common controls retain their current select or menu behavior. Search keeps an explicit accessible label. Toolbars wrap cleanly on tablet and stack on mobile.

### Data surfaces

Existing tables remain semantic tables on desktop. Their visual treatment changes to editorial rosters: taller rows, stronger identity cells, quieter headers, consistent numeric alignment, clearer status blocks, and persistent row actions. On small screens, horizontal scrolling remains available; essential identity and status columns stay visually dominant.

Blog and Resources prioritize thumbnails. Directory and Users prioritize avatars or generated initials. Funding prioritizes the opportunity/funder relationship and verification state. Payments prioritizes reconciliation health and monetary values.

## Data and Behavior

All React Query hooks, mutations, permission checks, routes, dialog flows, confirmation prompts, audit events, and toast messages remain unchanged. The refactor changes presentation and local derived counts only. Actions continue to use their existing loading and disabled states.

The sidebar remains role-aware. Content editors continue to see only the routes and actions allowed by the existing guards and `contentPermissions` rules.

## Loading, Empty, and Error States

Existing state components remain functional but will sit inside the new page rhythm. Loading skeletons should approximate the new header, metric, toolbar, and roster structure where practical. Empty states keep a clear primary action. Errors remain explicit and retryable. Financial reconciliation errors must not imply that any access change occurred.

## Responsive and Accessibility Requirements

- Preserve the current mobile sidebar sheet and keyboard navigation.
- Maintain WCAG AA contrast for text and controls.
- Pair every status color with text or an icon.
- Keep visible focus treatment on all interactive elements.
- Respect `prefers-reduced-motion`.
- Avoid hiding destructive or administrative actions behind hover-only affordances.
- Keep tables navigable and horizontally scrollable at narrow widths.

## Implementation Boundaries

Admin-specific tokens and styles live in the AdminPanel application so the public Cresciva frontend is not unintentionally redesigned. Shared UI components will be composed rather than globally restyled where a change could affect other applications. Backend schemas, Supabase functions, query contracts, and server routes are out of scope.

## Verification

The implementation is complete when:

- type checking, linting, and the AdminPanel test suite pass;
- existing AdminLayout, Blog, Resources, Profiles, Users, Funding, and Payments behavior remains intact;
- desktop screenshots visually match the generated system's hierarchy and energy;
- priority pages remain usable at mobile, tablet, and desktop widths;
- no unrelated working-tree changes are overwritten.

