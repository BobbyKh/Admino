# Market Readiness Plan

## Verdict

Admino has moved from internal MVP toward private alpha readiness. It still needs broader e2e coverage, payment-positioning decisions, and a full multi-tenant security review before public market launch.

## Completed

1. Fixed the production build type issue in `app/admin/(panel)/sites/page.tsx` by typing tenant feature access as `TenantFeature[]`.
2. Replaced deprecated `middleware.ts` with `proxy.ts` and renamed the exported function to `proxy` for Next.js 16.
3. Added admin login rate limiting in `app/admin/login/actions.ts` using the existing rate-limit utility.
4. Hardened uploads with shared content-signature validation in `lib/upload-validation.ts`, folder sanitization, SVG rejection, and tenant media-feature enforcement.
5. Added a dependency-free smoke test foundation with `npm test` and tests for upload validation and block config safety.
6. Improved the page builder editor with visible autosave status, save error display, and a published-page preview link.

## Remaining Before Public Launch

1. Add full e2e tests for login, site selection, page creation, block editing, publishing, uploads, checkout, and tenant isolation.
2. Add revision history or undo/redo for builder edits.
3. Decide whether ecommerce is production payments or manual/test payments, then update UI/docs accordingly.
4. Run a full multi-tenant security review before accepting untrusted customer content.
5. Replace in-memory login rate limiting with a shared production store if deployed across multiple instances.

## Positive Foundation

- Multi-tenant data model exists for sites, pages, blocks, media, users, settings, products, carts, and orders.
- Tenant-aware access checks exist for page/block actions.
- Block config has size/type validation.
- Rich text and custom HTML are sanitized before rendering.
- `npm run lint` passes with warnings only.
- `npm test` covers critical upload and block-config validation paths.
