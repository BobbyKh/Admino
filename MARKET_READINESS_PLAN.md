# Market Readiness Plan

## Verdict

Admino is not ready for public market launch yet. It is suitable for internal demo or private alpha after the production build is fixed.

## Tomorrow Checklist

1. Fix the production build failure in `app/admin/(panel)/sites/page.tsx`.
2. Replace deprecated Next.js `middleware.ts` convention with the current proxy convention.
3. Add login rate limiting to `app/admin/login/actions.ts` using the existing `lib/rate-limit.ts` utility or a production-safe equivalent.
4. Harden uploads in `app/api/upload/route.ts` with stronger file validation and feature/permission checks.
5. Add automated smoke tests for login, site selection, page creation, block editing, publishing, uploads, checkout, and tenant isolation.
6. Improve builder UX safeguards: visible save status, autosave failure handling, preview, and revision/undo strategy.
7. Decide whether ecommerce is production payments or manual/test payments, then update UI/docs accordingly.
8. Run a multi-tenant security review before accepting untrusted customer content.

## Current Release Blockers

- `npm run build` fails TypeScript checking at `app/admin/(panel)/sites/page.tsx:114` because `string[]` is assigned to `TenantFeature[]` state.
- No unit, integration, or e2e test suite exists.
- Admin login currently has no rate limiting.
- Builder editor is functional but MVP-level: autosave-only, no revision history, no undo/redo, and no full live preview.
- Uploads rely on browser-reported MIME type and do not perform deep file/content validation.
- Ecommerce payment flow is still lightweight/manual/test-oriented.
- Next.js reports the `middleware` file convention is deprecated and should move to the proxy convention.

## Positive Foundation

- Multi-tenant data model exists for sites, pages, blocks, media, users, settings, products, carts, and orders.
- Tenant-aware access checks exist for page/block actions.
- Block config has size/type validation.
- Rich text and custom HTML are sanitized before rendering.
- `npm run lint` passes with warnings only.
