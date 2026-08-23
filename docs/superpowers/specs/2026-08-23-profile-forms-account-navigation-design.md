# Profile Forms & Account Navigation Design

**Date:** 2026-08-23

## Goal

Make profile completion clearer and more useful for Cresciva members, fix public sharing and Google OAuth URL handling, and split account settings into separate navigable pages.

## Product direction

Cresciva’s dashboard should feel like a practical funding-readiness workspace rather than a generic settings form. Form examples should refer to businesses, funding, impact, markets, and operations. Inputs should help users make a good choice while they type, without requiring users to remember exact spelling or formatting.

## Architecture

The existing React Router, React Hook Form, and Supabase seams remain in place. New reusable form primitives will live under `Frontend/src/components/forms` and be consumed by `ProfileFields`. Account navigation will remain inside the dashboard shell but use nested routes so each category renders as a full page.

Public profile sharing will use a canonical production origin of `https://www.crescivacapital.com` for deployed/share URLs. Localhost remains the origin for local development callbacks and test URLs. Google OAuth will use the same `/auth?next=...` callback contract and the production callback must be allow-listed in Supabase/Google configuration.

## User-facing changes

### Profile form

- Funding target accepts a numeric amount and renders an accessible live explanation underneath, such as “One hundred US dollars”.
- Keyword input offers matching Cresciva-relevant suggestions while typing and still supports Enter/comma chip creation.
- Operating countries uses the same searchable suggestion pattern, includes a country flag in the menu/chips, and stores the canonical country name.
- Phone and WhatsApp inputs use a selected country dialing code and flag, while storing a normalized international number.
- All placeholder/helper examples remove generic “shea butter, export, Lagos” language and use Cresciva-specific examples.

### Sharing

- Share link, copy link, WhatsApp share, native share, and public-page links use the canonical production domain in deployed builds.
- The displayed URL is never a localhost URL in a production build.

### Account

- Account becomes a category landing/menu with separate full pages for Membership, Security & password, Notifications, and Data & account deletion.
- Password settings are not rendered on the membership page or the same page as unrelated account categories.
- Existing deep links such as `/dashboard/account#billing` redirect or resolve to the membership page without breaking payment callbacks.

## Accessibility and behavior

- Autocomplete menus support keyboard navigation, Escape to close, and screen-reader labels.
- Live currency wording uses `aria-live="polite"` and does not replace the numeric field value.
- Country and phone selectors expose selected values to assistive technology and preserve a usable mobile layout.
- Unsaved profile changes continue to use the existing `useUnsavedChanges` guard.

## Testing

Add focused tests for:

- canonical profile URL generation and local origin behavior;
- currency-to-words output and live field rendering;
- keyword/country suggestion filtering and selection;
- phone country-code formatting;
- account route rendering and legacy billing navigation;
- OAuth redirect URL construction.

## Configuration note

The production OAuth callback URI is `https://www.crescivacapital.com/auth`. It must be registered in Supabase Auth URL configuration and in the Google OAuth client’s authorized redirect URI list. Local development continues to use the active localhost origin.
