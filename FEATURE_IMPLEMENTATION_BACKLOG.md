# Admino Feature Implementation Backlog

## Purpose

This document is the consolidated feature-gap analysis for the current Admino codebase. It distinguishes:

- `Implemented`: a working end-to-end path exists.
- `Partial`: schema, UI, or backend exists, but the complete user flow is missing or unsafe.
- `Missing`: no usable end-to-end implementation exists.
- `Hardening`: an existing feature needs production correctness, authorization, reliability, or operational support.

The order is intentional. P0 work protects tenant data and money. Marketplace and growth work should begin only after the relevant P0 foundations are complete.

## Existing Foundation

The project already provides a broad foundation:

- Multi-tenant sites resolved by hostname or preview slug.
- Admin JWT authentication and customer authentication.
- Admin roles and per-tenant feature flags.
- Pages, blocks, revisions, navigation, settings, media, gallery, menu, services, and blog.
- Public storefront rendering and customer account pages.
- Product, cart, order, manual payment, eSewa, and partial Stripe flows.
- Bookings and contact messages.
- AI generation, site builder, auditor, forecasting, RAG, and storefront chat.
- Analytics, funnels, experiments, webhooks, exports, and error logging at varying levels of completeness.
- Docker, Vercel, CI, PostgreSQL migrations, tests, security headers, and rate limiting.

## P0: Authorization And Tenant Safety

Status: required before onboarding paying tenants.

### Backend RBAC Enforcement

Current state: Partial.

The sidebar hides features by role, but several server actions only require authentication or feature access. A viewer can potentially invoke mutations directly.

- [x] Introduce central role and permission guards for backend actions.
- [x] Require editor or higher for content mutations.
- [x] Require admin or higher for settings, integrations, webhooks, customers, payments, and user management.
- [ ] Require super-admin for global plans, global subscriptions, platform settings, and marketplace moderation.
- [ ] Apply guards to navigation, menu, gallery, media, bookings, messages, i18n, experiments, funnels, webhooks, and customer administration.
- [ ] Add a complete role-action matrix test for viewer, editor, admin, and super-admin.

Relevant code:

- `lib/auth.ts`
- `lib/tenant-features.ts`
- `lib/actions/settings.ts`
- `lib/actions/navigation.ts`
- `lib/actions/menu.ts`
- `lib/actions/gallery.ts`
- `lib/actions/media.ts`
- `lib/actions/webhooks.ts`
- `lib/actions/billing.ts`

### Billing Authorization

Current state: Partial and unsafe.

- [x] Protect subscription selection and cancellation with an authenticated admin context.
- [x] Protect Stripe subscription checkout and portal API routes.
- [x] Resolve subscription operations from a trusted active site ID, not the public request hostname alone.
- [x] Make plan creation, plan deletion, and global subscription listing super-admin-only.
- [ ] Add CSRF and replay tests for all billing mutations.
- [ ] Add tenant-isolation tests for subscription management.

Relevant code:

- `lib/actions/billing.ts:100-228`
- `app/api/payments/stripe/subscription-checkout/route.ts`
- `app/api/payments/stripe/portal/route.ts`

### Complete i18n Tenant Isolation

Current state: Partial and unsafe.

- [x] Restrict locale translation deletion to pages and blocks belonging to the active site.
- [x] Verify every saved locale belongs to the page or block tenant.
- [x] Require editor permission for translation mutations.
- [ ] Add two-tenant tests using the same locale code.
- [ ] Add foreign-key-safe cleanup for locale deletion.

Relevant code:

- `lib/actions/i18n.ts:76-114`
- `lib/actions/i18n.ts:166-272`

### Tenant-Aware Integration Credentials

Current state: Partial.

- [x] Resolve SMTP settings using an explicit site ID for public bookings, messages, orders, and password workflows.
- [x] Stop resolving public email configuration through the active admin-site fallback.
- [x] Resolve Cloudinary credentials using an explicit site ID and tenant-prefixed asset folders.
- [ ] Encrypt SMTP, Cloudinary, and AI credentials at rest.
- [ ] Add secret key versioning and rotation.
- [ ] Add masked credential status APIs instead of returning stored values to clients.
- [ ] Add per-tenant email and media integration diagnostics.

Relevant code:

- `lib/email.ts:13-55`
- `lib/settings-admin.ts`
- `lib/cloudinary.ts`
- `lib/settings.ts`

### Outgoing Webhook SSRF Protection

Current state: Missing hardening.

- [ ] Permit HTTPS webhook destinations only.
- [ ] Reject loopback, private, link-local, metadata, and reserved IP ranges.
- [ ] Resolve and validate DNS before each delivery.
- [ ] Revalidate every redirect destination or disable redirects.
- [ ] Add connection, response-size, and total-time limits.
- [x] Require admin permission to create and edit webhooks.
- [ ] Add SSRF tests for IPv4, IPv6, encoded hosts, DNS rebinding, and redirects.

Relevant code:

- `lib/actions/webhooks.ts`
- `lib/webhooks.ts`

## P0: Commerce Correctness

Status: required before advertising live automated payments.

### Stripe Storefront Checkout

Current state: Partial and not production-safe.

- [ ] Collect and persist customer email, name, phone, delivery address, and delivery notes.
- [ ] Preserve selected product options in Stripe order items.
- [ ] Create the payment attempt and pending order transactionally or implement reliable compensation.
- [ ] Remove orphan orders when Checkout Session creation fails.
- [ ] Reserve inventory before redirecting to Stripe.
- [ ] Release inventory when a session expires or payment fails.
- [ ] Delete the cart only after verified payment or intentional order conversion.
- [ ] Verify the Stripe Checkout Session on the success page.
- [ ] Never show payment confirmation based only on a URL query parameter.
- [ ] Add abandoned checkout cleanup.

Relevant code:

- `app/api/payments/stripe/checkout/route.ts:95-163`
- `components/site/checkout-page-client.tsx`
- `app/(site)/checkout/success/page.tsx`

### Payment Ledger And Webhook Idempotency

Current state: Missing.

- [ ] Add `payment_transactions` records for provider, event, amount, currency, status, and raw reference.
- [ ] Add `processed_payment_events` with a unique provider event ID.
- [ ] Process each payment event exactly once inside a database transaction.
- [ ] Handle concurrent duplicate webhook requests safely.
- [ ] Store webhook verification and reconciliation outcomes.
- [ ] Reconcile paid, failed, refunded, partially refunded, disputed, and chargeback states.
- [ ] Decide whether Stripe uses one platform account, Connect accounts, or tenant-owned accounts.
- [ ] Align the credential UI and webhook verification with the selected Stripe account model.

Relevant code:

- `app/api/payments/stripe/webhook/route.ts`
- `lib/db/schema-postgres.ts`
- `components/admin/payment-manager.tsx`

### Inventory Reservation

Current state: Partial and race-prone.

- [ ] Replace read-then-write inventory changes with atomic conditional SQL updates.
- [ ] Add stock reservations with expiration timestamps.
- [ ] Release reservations after payment timeout, cancellation, or provider failure.
- [ ] Restore stock exactly once on rejected or refunded orders.
- [ ] Prevent negative inventory under concurrent checkout.
- [ ] Add concurrency tests for the last available item.

Relevant code:

- `lib/actions/storefront-commerce.ts:135-146`
- `app/api/payments/esewa/failure/route.ts`
- `app/api/payments/stripe/webhook/route.ts`

### Tax, Shipping, Discounts, And Totals

Current state: Partial.

- [ ] Apply configured tax rates to checkout totals.
- [ ] Apply configured shipping methods and shipping prices.
- [ ] Persist subtotal, discount, tax, shipping, and total separately.
- [ ] Add discount codes with validity, usage, customer, and product rules.
- [ ] Add free-shipping rules.
- [ ] Recalculate all totals server-side.
- [ ] Add currency consistency checks across cart products and payment provider requests.

Relevant code:

- `lib/actions/commerce.ts:121-149`
- `lib/actions/storefront-commerce.ts:131-145`
- `app/api/payments/stripe/checkout/route.ts`

### Refunds And Disputes

Current state: Missing.

- [ ] Add full and partial refund actions.
- [ ] Add refund reason, amount, provider reference, actor, and timestamp.
- [ ] Add dispute and chargeback states.
- [ ] Add refund and dispute administration UI.
- [ ] Restore stock according to configurable refund policy.
- [ ] Send customer and merchant notifications.
- [ ] Add audit and webhook events.

### Payment Provider Completion

Current state: Partial.

- [ ] Complete live eSewa failure, timeout, cancellation, and reconciliation flows.
- [ ] Implement Khalti initiation, callback, verification, and reconciliation or remove it from available provider UI.
- [ ] Add payment-provider health and credential tests.
- [ ] Clearly label test and live modes in checkout and admin.

## P0: Reliability And Operations

### Durable Background Jobs

Current state: Missing.

- [ ] Add a durable queue for emails, outgoing webhooks, AI indexing, exports, and cleanup.
- [ ] Replace in-process webhook sleep/retry loops.
- [ ] Add retry policy, dead-letter state, next-attempt timestamp, and manual retry.
- [ ] Add idempotency keys to every background job.
- [ ] Add worker health and queue-depth monitoring.
- [ ] Decide whether to use Redis, PostgreSQL jobs, or a managed queue.

Relevant code:

- `lib/webhooks.ts`
- `docker-compose.yml`

### Backup And Restore

Current state: Missing.

- [ ] Add automated PostgreSQL backups.
- [ ] Encrypt backup storage.
- [ ] Define retention periods.
- [ ] Add a tested restore procedure.
- [ ] Run scheduled staging restore drills.
- [ ] Document RPO and RTO targets.
- [ ] Distinguish tenant content export from infrastructure backup.

### Monitoring And Health

Current state: Partial.

- [ ] Add authenticated health checks for application, database, queue, email, media, AI, and payment providers.
- [ ] Add uptime monitoring from outside the deployment.
- [ ] Add structured logs and request IDs.
- [ ] Add external error monitoring and alert delivery.
- [ ] Add payment webhook and email failure alerts.
- [ ] Add a public status page before public launch.

### Deployment Safety

Current state: Partial.

- [ ] Apply migrations as a controlled deployment step.
- [ ] Test migrations from an empty database and from the previous release.
- [ ] Add release tagging and rollback procedures.
- [ ] Add dependency and secret scanning to CI.
- [ ] Add a `.env.example` without real secrets.
- [ ] Pass all documented production environment variables through Docker Compose.
- [ ] Add startup validation for required production variables.

## P1: Storefront Features That Are Currently UI-Only

### Newsletter Subscription

Current state: Missing backend.

- [ ] Add newsletter subscriber table with site ID, email, status, source, locale, and timestamps.
- [ ] Connect the newsletter block to a real server action.
- [ ] Add confirmation or double opt-in.
- [ ] Add unsubscribe flow.
- [ ] Add consent evidence and suppression status.
- [ ] Add CSV export and email-provider integration.
- [ ] Add rate limiting and duplicate handling.

Relevant code:

- `components/site/blocks/newsletter-block.tsx:26-45`

### Page-Builder Contact Form Block

Current state: Missing backend connection.

- [ ] Connect the block to the existing tenant-resolved contact action.
- [ ] Support configurable fields and required-field validation.
- [ ] Store form identity and submission data.
- [ ] Add spam protection, rate limiting, and optional CAPTCHA.
- [ ] Add submission email and webhook delivery.
- [ ] Add form submission administration and export.

Relevant code:

- `components/site/blocks/contact-form-block.tsx`
- `lib/actions.ts`
- `lib/actions/forms.ts`

### Authentication Block

Current state: Missing backend connection.

- [ ] Connect login mode to customer authentication.
- [ ] Connect registration mode to customer registration.
- [ ] Add password reset for storefront customers.
- [ ] Add redirect and return URL handling.
- [ ] Add validation and abuse protection.
- [ ] Hide or remove the block until it performs real authentication.

Relevant code:

- `components/site/blocks/auth-form-block.tsx`
- `lib/actions/customers.ts`

## P1: Internationalization

Current state: Partial and not applied to storefront content.

- [ ] Render translated pages and page blocks using the selected locale.
- [ ] Translate navigation and global site settings.
- [ ] Add product, blog, menu, service, and category translations.
- [ ] Add localized slugs and locale-aware routing.
- [ ] Add `hreflang`, localized canonical URLs, and localized sitemap entries.
- [ ] Add locale fallback rules.
- [ ] Add translation completeness indicators.
- [ ] Add storefront tests for locale switching and fallback.

Relevant code:

- `lib/i18n.ts`
- `components/site/locale-switcher.tsx`
- `app/(site)/[slug]/page.tsx`
- `app/(site)/page.tsx`

## P1: Analytics And Experimentation

### Trusted Analytics Ingestion

Current state: Partial.

- [ ] Resolve the tenant from request context instead of accepting arbitrary site IDs.
- [ ] Rate-limit analytics ingestion.
- [ ] Add bot filtering and event validation.
- [ ] Add cookie and analytics consent controls.
- [ ] Add retention and deletion jobs.
- [ ] Add privacy-safe visitor identity handling.
- [ ] Document data collected and retention period.

### Click Heatmaps

Current state: Partial; reporting exists but collection is missing.

- [ ] Add storefront click event collection.
- [ ] Normalize click coordinates across responsive layouts.
- [ ] Exclude sensitive form inputs and account pages.
- [ ] Sample high-volume traffic.
- [ ] Add consent and retention controls.

### Ordered Funnels

Current state: Partial.

- [ ] Track funnel events with event timestamps and visitor sessions.
- [ ] Require ordered progression through funnel steps.
- [ ] Support optional and repeated steps.
- [ ] Add conversion windows.
- [ ] Add product and checkout funnel presets.
- [ ] Remove or implement the empty `trackFunnelStep` action.

Relevant code:

- `lib/actions/funnels.ts:144-154`

### A/B Experiments

Current state: Partial and disconnected from storefront rendering.

- [ ] Connect experiment assignment to rendered blocks.
- [ ] Emit stable experiment identifiers in storefront markup.
- [ ] Render assigned variants server-side to avoid flicker.
- [ ] Record impressions and conversions.
- [ ] Add allocation validation and experiment scheduling.
- [ ] Prevent overlapping experiments on the same target.
- [ ] Add statistical confidence or clearly label results as descriptive only.

Relevant code:

- `components/site/experiment-provider.tsx`
- `components/site/experiment-block.tsx`
- `lib/actions/experiments.ts`

## P1: Customer And Commerce Experience

### Customer-Linked Checkout

Current state: Partial.

- [ ] Attach logged-in customers to new orders.
- [ ] Prefill checkout from customer profile.
- [ ] Offer saved addresses.
- [ ] Save a new checkout address by choice.
- [ ] Ensure guest checkout remains available by tenant setting.
- [ ] Make logged-in checkout orders appear in customer order history.

### Cart Improvements

- [ ] Merge anonymous cart into customer cart after login.
- [ ] Add cart expiration and cleanup.
- [ ] Add abandoned-cart tracking and optional recovery email.
- [ ] Validate price and inventory on every cart read and checkout.
- [ ] Add cart-level discounts and shipping estimates.

### Order Management

- [ ] Add order timeline and internal merchant notes.
- [ ] Add fulfillment records, carrier, and tracking number.
- [ ] Add partial fulfillment.
- [ ] Add cancellation reasons and permissions.
- [ ] Add printable invoices and packing slips.
- [ ] Add order search and advanced filters.
- [ ] Add customer-facing cancellation and return requests.

### Product Catalog

- [ ] Replace string options with structured variants and SKUs.
- [ ] Track inventory per variant.
- [ ] Add product collections, tags, vendor, and brand.
- [ ] Add bulk import/export.
- [ ] Add image galleries and image ordering.
- [ ] Add sale price and scheduled pricing.
- [ ] Add SEO fields per product.
- [ ] Add related and recommended products.

## P1: Content And Publishing

### Real Scheduled Publishing

Current state: Partial.

- [ ] Keep future-dated posts hidden until publication time.
- [ ] Add scheduled page publishing and unpublishing.
- [ ] Add a durable publishing job or query-time schedule enforcement.
- [ ] Display scheduled status in admin.
- [ ] Add timezone selection per tenant.
- [ ] Add schedule tests for storefront and sitemap visibility.

### Tenant-Correct Sitemap And SEO

Current state: Partial.

- [ ] Generate URLs for each tenant hostname or custom domain.
- [ ] Include only content belonging to published sites.
- [ ] Prevent duplicate URL entries across tenants.
- [ ] Generate localized sitemap entries.
- [ ] Add tenant-aware robots and canonical URLs.
- [ ] Add image sitemap support where useful.

Relevant code:

- `app/sitemap.ts`
- `app/robots.ts`

### Booking Availability Engine

Current state: Partial; currently a reservation request form.

- [ ] Add tenant opening hours.
- [ ] Add bookable resources such as tables, rooms, staff, or services.
- [ ] Add capacity, duration, buffers, and slot intervals.
- [ ] Add blackout dates and holidays.
- [ ] Add live availability queries.
- [ ] Prevent conflicting reservations transactionally.
- [ ] Add reschedule and cancellation links.
- [ ] Add reminders and no-show status.
- [ ] Add calendar view and calendar integrations.

### Page Builder Improvements

- [ ] Make duplicate block copy title, config, visibility, and related data.
- [ ] Add reusable global blocks and saved sections.
- [ ] Add responsive settings per block.
- [ ] Add draft preview links.
- [ ] Add page-level publish workflow and approvals.
- [ ] Add collaboration indicators or optimistic conflict detection.
- [ ] Add revision retention and pruning.

## P1: Audit, Webhooks, And Data Portability

### Real Activity Audit Trail

Current state: Partial; utility exists but current actions are not consistently wired.

- [ ] Record login, logout, password reset, settings, user, page, media, product, payment, order, and billing changes.
- [ ] Include actor, tenant, action, target, before/after summary, IP, and request ID.
- [ ] Prevent tenant admins from modifying audit records.
- [ ] Add retention and export policy.
- [ ] Add filters by actor, action, target, and date.

### Complete Webhook Event Coverage

Current state: Partial.

- [ ] Dispatch registered page events.
- [ ] Dispatch registered product events.
- [ ] Dispatch booking events.
- [ ] Dispatch order fulfillment and cancellation events.
- [ ] Dispatch generic form events.
- [ ] Add event version and idempotency key.
- [ ] Document payload schemas from actual emitted data.

### Complete Tenant Export And Import

Current state: Partial export; no restore/import.

- [ ] Define portable export schema versions.
- [ ] Include customers, translations, experiments, analytics, funnels, webhooks, activity, and relevant settings based on export mode.
- [ ] Exclude or separately encrypt secrets.
- [ ] Add tenant import with validation and dry-run summary.
- [ ] Add full-site clone for agencies and staging.
- [ ] Label partial exports accurately until restore is supported.

## P1: SaaS Billing And Quotas

Current state: Partial.

- [ ] Define authoritative Starter, Growth, Business, and Agency plans.
- [ ] Enforce page quotas in page creation actions.
- [ ] Enforce product quotas in product creation actions.
- [ ] Enforce user, site, media storage, bandwidth, AI, and order quotas.
- [ ] Meter usage transactionally.
- [ ] Add trial, grace period, suspension, reactivation, upgrade, and downgrade behavior.
- [ ] Add invoice history and billing notifications.
- [ ] Add owner metrics for MRR, churn, trials, failed payments, and active tenants.
- [ ] Test every limit through direct server calls, not only UI controls.

Relevant code:

- `lib/billing.ts`
- `lib/actions/billing.ts`
- `app/admin/(panel)/billing/page.tsx`

## P2: Theme And Template Marketplace

Current state: Missing marketplace; static built-in presets exist.

The detailed implementation is in `THEME_MARKETPLACE_PLAN.md`.

- [ ] Refactor built-in presets into a versioned data-only package schema.
- [ ] Add visual-theme-only installation.
- [ ] Add template impact preview.
- [ ] Prevent duplicate pages and blocks.
- [ ] Add pre-install snapshots and rollback.
- [ ] Add operator-only package uploads and moderation.
- [ ] Add marketplace browse, search, filter, preview, and installation UI.
- [ ] Add creator profiles, submissions, versions, changelogs, reviews, and reports.
- [ ] Add licenses, marketplace checkout, commissions, refunds, taxes, and payouts.
- [ ] Never execute uploaded JavaScript, React components, server code, or migrations.

## P2: Onboarding And Domain Automation

- [ ] Add tenant-facing onboarding progress.
- [ ] Add guided site setup with template, content, integrations, domain, and publish steps.
- [ ] Add automated DNS verification polling.
- [ ] Add SSL and routing status.
- [ ] Add DNS instructions for common providers.
- [ ] Add custom-domain conflict detection.
- [ ] Add empty states and contextual setup prompts.
- [ ] Add onboarding analytics and completion funnel.

## P2: Agency And Collaboration

- [ ] Add organizations and teams separate from individual tenant assignment.
- [ ] Allow users to belong to multiple sites with different roles.
- [ ] Add invitations and invitation expiry.
- [ ] Add agency client access.
- [ ] Add white-label admin branding.
- [ ] Add site duplication and staging environments.
- [ ] Add approval workflows for editors and clients.
- [ ] Add support impersonation with explicit consent and audit logging.

## P2: Search, Marketing, And Growth

- [ ] Add storefront full-text search.
- [ ] Add product filtering and sorting.
- [ ] Add newsletter campaign integrations.
- [ ] Add lead source and UTM attribution.
- [ ] Add abandoned-cart recovery.
- [ ] Add customer segmentation.
- [ ] Add coupons, referrals, gift cards, and loyalty points.
- [ ] Add reviews and moderation for products or services.
- [ ] Add integrations for analytics, CRM, automation, and accounting tools.
- [ ] Add a public API and scoped API keys only after authorization is mature.

## P2: AI Productization

- [ ] Add per-tenant and per-user AI usage limits.
- [ ] Add token, cost, provider, model, and latency metering.
- [ ] Add prompt and output audit records without leaking secrets.
- [ ] Add content approval before AI changes are published.
- [ ] Add queued AI jobs for long-running generation and indexing.
- [ ] Add cancellation, retry, and progress.
- [ ] Add provider fallback policies.
- [ ] Add prompt-injection defenses for RAG and site-builder operations.
- [ ] Add safe tool permission boundaries for agentic changes.
- [ ] Add content quality and accessibility checks.

## P2: Maintenance Cleanup

- [x] Remove obsolete `lib/cms-actions.ts` after confirming no internal consumers.
- [ ] Consolidate duplicate security-header configuration.
- [ ] Remove unused Redis or implement a deliberate queue strategy.
- [ ] Resolve lint warnings and replace important raw images with `next/image`.
- [ ] Remove stale documentation claims.
- [ ] Add data cleanup for stale carts, pending orders, revisions, errors, analytics, and webhook deliveries.
- [ ] Disable the framework-powered header.
- [ ] Add database indexes based on production query analysis.

## Test Program Needed

Current state: 35 passing tests, mostly source-structure assertions rather than behavioral integration tests.

### Database Integration Tests

- [ ] Test migrations against an empty PostgreSQL database.
- [ ] Test tenant isolation with real rows and transactions.
- [ ] Test the complete RBAC matrix.
- [ ] Test locale deletion isolation.
- [ ] Test quota enforcement.
- [ ] Test inventory concurrency.
- [ ] Test webhook idempotency.
- [ ] Test theme reinstall and rollback.

### Browser End-To-End Tests

- [ ] Admin login, logout, reset, and session expiry.
- [ ] Tenant selection and cross-tenant access denial.
- [ ] Page create, edit, preview, publish, revision, and restore.
- [ ] Media upload and deletion.
- [ ] Booking and contact submission.
- [ ] Customer registration, login, address, wishlist, and order history.
- [ ] Cart and every supported checkout provider.
- [ ] Subscription checkout and billing portal.
- [ ] Theme preview, install, and rollback.

### Non-Functional Tests

- [ ] Accessibility tests.
- [ ] Visual regression tests.
- [ ] Load tests for storefront, checkout, upload, chat, and webhooks.
- [ ] Security tests for SSRF, IDOR, CSRF, XSS, archive uploads, and rate limits.
- [ ] Backup restore drills.
- [ ] Dependency and container vulnerability scans.
- [ ] Coverage reporting with meaningful thresholds.

## Documentation Corrections Needed

- [ ] Replace “fully production-ready” with the current controlled-alpha status.
- [ ] Replace “35 test suites” with “35 test cases” until real suites are organized.
- [ ] Remove “zero data leakage” until the full two-tenant integration test passes.
- [ ] Remove “full activity audit log” until live actions emit audit events.
- [ ] Remove “scheduled publishing” until future content is hidden correctly.
- [ ] Mark Stripe Billing and storefront Stripe checkout as partial.
- [ ] Mark A/B testing, heatmaps, funnels, and storefront i18n as partial.
- [ ] Mark tenant export as partial and non-restorable.
- [ ] Document exactly which webhook events are emitted.

Documents to update:

- `README.md`
- `MARKET_READINESS_PLAN.md`
- `PHASES.md`
- `NEXT_PHASE_PLAN.md`
- `lib/docs-content.ts`

## Recommended Delivery Order

### Milestone 1: Safe Tenant Administration

- [ ] Complete backend RBAC.
- [ ] Fix billing authorization.
- [ ] Fix i18n deletion scope.
- [ ] Fix tenant-aware SMTP and credential encryption.
- [ ] Harden outgoing webhooks.
- [ ] Add DB-backed tenant and role tests.

### Milestone 2: Correct Live Commerce

- [ ] Build inventory reservations.
- [ ] Build payment ledger and event idempotency.
- [ ] Correct Stripe checkout and success verification.
- [ ] Apply tax and shipping.
- [ ] Add refunds, disputes, and reconciliation.
- [ ] Connect customer accounts to checkout.

### Milestone 3: Reliable Operations

- [ ] Add durable jobs.
- [ ] Add backups and tested restore.
- [ ] Add monitoring and alerting.
- [ ] Add migration and rollback automation.
- [ ] Add real integration and browser tests.

### Milestone 4: Finish Advertised Features

- [ ] Wire newsletter, contact, and authentication blocks.
- [ ] Complete storefront i18n.
- [ ] Complete experiments, ordered funnels, and heatmaps.
- [ ] Complete audit logs and webhook event coverage.
- [ ] Complete scheduled publishing and tenant sitemaps.
- [ ] Enforce SaaS quotas.

### Milestone 5: Marketplace Foundation

- [ ] Add versioned theme packages.
- [ ] Add transactional installation, preview, snapshot, and rollback.
- [ ] Add curated operator uploads.
- [ ] Add creator submissions after validation is proven.
- [ ] Add paid listings after SaaS billing is stable.

### Milestone 6: Public SaaS Launch

- [ ] Add onboarding and domain automation.
- [ ] Add agency collaboration.
- [ ] Add legal, privacy, consent, retention, and deletion workflows.
- [ ] Complete load, security, accessibility, and disaster-recovery testing.
- [ ] Publish marketing, documentation, support, and status infrastructure.

## Immediate Next Sprint

The highest-value next sprint should not start with the marketplace. It should deliver:

1. Completed: central write/admin/super-admin guards and adoption across current mutation modules.
2. Completed: billing endpoint authorization and removal of public subscription mutations.
3. Completed: tenant-safe locale deletion and locale validation.
4. Tenant-explicit SMTP configuration and encrypted integration secrets.
5. Webhook destination validation against SSRF.
6. Real PostgreSQL integration tests for two tenants and four roles.

After that sprint, begin payment correctness and inventory reservations.
