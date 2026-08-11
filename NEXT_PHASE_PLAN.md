# Admino Next Phase Plan

The complete codebase feature-gap inventory and prioritized implementation backlog is maintained in `FEATURE_IMPLEMENTATION_BACKLOG.md`.

## Current Position

The current release is ready for private alpha and controlled soft-launch onboarding:

- Production build passes with Bun.
- All 35 automated tests pass.
- Authentication and tenant-isolation blockers identified in the audit are fixed.
- Public booking and contact actions are rate-limited.
- AI custom endpoint validation and cron cleanup are implemented.

This release is not yet ready to advertise as a fully automated commerce platform. Payment settlement, refunds, disputes, subscription billing, and production operations still need to be completed.

## Phase 1: Soft Launch Hardening

Priority: P0

Goal: onboard a small number of real businesses safely.

### Tasks

- [ ] Run a manual tenant-isolation test with two independent sites and two admin accounts.
- [ ] Verify admin login, logout, password reset, uploads, page publishing, forms, bookings, and exports in production.
- [ ] Configure `AUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `SITE_URL`, SMTP, Cloudinary, and encryption secrets in the deployment environment.
- [ ] Apply all PostgreSQL migrations in a staging database before production.
- [ ] Configure daily database backups and test a restore.
- [ ] Add uptime monitoring and error alerting for the application, database, email, Cloudinary, and payment webhooks.
- [ ] Review remaining lint warnings and convert important image elements to optimized `next/image` usage.
- [ ] Add browser-level tests for admin login, tenant switching, page publishing, upload, booking, and checkout.
- [ ] Publish a privacy policy, terms of service, refund policy, and acceptable-use policy.

### Exit Criteria

- Two tenants can operate without data leakage.
- A failed deployment can be rolled back.
- Database restore is proven in staging.
- Critical production errors generate alerts within five minutes.
- At least three real businesses complete onboarding without engineering intervention.

## Phase 2: Live Commerce Payments

Priority: P0

Goal: replace manual/test payment handling with reliable payment confirmation.

### Tasks

- [ ] Define supported payment providers and supported countries/currencies.
- [ ] Implement live Stripe payment configuration with tenant-scoped credentials.
- [ ] Verify webhook signatures, event idempotency, replay handling, and duplicate-event protection.
- [ ] Tie order fulfillment only to verified payment events.
- [ ] Add payment transaction records and reconciliation status.
- [ ] Add refund and partial-refund workflows.
- [ ] Add failed-payment, expired-payment, dispute, and chargeback states.
- [ ] Prevent inventory overselling with transactional stock reservation and release.
- [ ] Add payment and order audit events for every state transition.
- [ ] Complete a PCI-DSS scope review with the payment provider architecture.

### Exit Criteria

- A successful live payment creates exactly one paid order.
- Duplicate webhooks do not duplicate orders, emails, or inventory changes.
- Refunds and payment failures are visible and actionable in the admin panel.
- A full payment-to-fulfillment flow is tested in production using a low-value transaction.

## Phase 3: SaaS Billing And Limits

Priority: P0

Goal: enable Admino to charge tenant customers for the platform.

### Tasks

- [ ] Define Starter, Growth, Business, and Agency plans.
- [ ] Define limits for sites, storage, users, AI usage, products, and monthly orders.
- [ ] Implement Stripe Billing subscriptions and customer portal access.
- [ ] Add trial periods and plan upgrade/downgrade flows.
- [ ] Enforce plan limits server-side, not only in the UI.
- [ ] Add usage metering for storage, AI calls, and payment volume.
- [ ] Handle failed invoices, grace periods, suspension, cancellation, and reactivation.
- [ ] Add invoice and billing-history access.
- [ ] Add platform-owner reporting for MRR, churn, active tenants, and failed payments.

### Exit Criteria

- A tenant can start a trial, subscribe, upgrade, downgrade, and cancel.
- Failed billing changes tenant access according to documented rules.
- Plan limits cannot be bypassed through server actions or direct requests.
- Billing events are idempotent and auditable.

## Phase 4: Domain And Onboarding Experience

Priority: P1

Goal: reduce setup time for new businesses.

### Tasks

- [ ] Build a guided onboarding checklist: create site, choose template, add content, configure contact details, connect domain, publish.
- [ ] Add automated DNS verification polling.
- [ ] Show domain verification, SSL, and routing status in the admin panel.
- [ ] Add clear domain setup instructions for common DNS providers.
- [ ] Add empty states and setup prompts to every admin module.
- [ ] Add one-click template replacement with a preview and rollback warning.
- [ ] Add tenant-facing setup completion percentage.

### Exit Criteria

- A new tenant can publish a basic site in under 15 minutes.
- Domain setup status is understandable without support assistance.
- Failed DNS verification provides a clear corrective action.

## Phase 5: Analytics, Reliability, And Support

Priority: P1

Goal: make the product measurable and supportable at scale.

### Tasks

- [ ] Add privacy-conscious page-view analytics.
- [ ] Add commerce funnel, conversion rate, revenue, and abandoned-cart reporting.
- [ ] Add exportable analytics reports.
- [ ] Add structured application logs with request IDs.
- [ ] Add health checks for database, email, Cloudinary, AI, and payment providers.
- [ ] Add background processing for webhook delivery, email retries, and heavy AI work.
- [ ] Add support tooling for tenant impersonation with explicit audit logging.
- [ ] Create incident-response and data-breach procedures.
- [ ] Define retention and deletion policies for customer, booking, error, and analytics data.

### Exit Criteria

- Operators can identify the cause of a failed order or webhook without database access.
- Tenant support actions are fully audited.
- Critical jobs retry safely and expose failure status.
- Data retention and deletion requests can be completed reliably.

## Phase 6: Public Launch

Priority: P1

Goal: launch Admino as a public SaaS product.

### Tasks

- [ ] Publish the marketing website and pricing pages.
- [ ] Publish product documentation and onboarding guides.
- [ ] Add public status page and support contact process.
- [ ] Add terms, privacy, cookie, refund, and payment disclosures.
- [ ] Prepare customer case studies and template previews.
- [ ] Add referral, affiliate, or agency partner workflows.
- [ ] Run a security review and dependency audit.
- [ ] Perform load testing for public pages, checkout, uploads, AI, and webhooks.
- [ ] Tag a release and document rollback procedures.

### Exit Criteria

- Production monitoring, backups, billing, payments, support, and legal pages are active.
- Load and security testing show no unresolved P0 or P1 findings.
- The support team can onboard and troubleshoot tenants using documented procedures.
- The public launch has a tested rollback and incident-response plan.

## Product Expansion: Theme Marketplace

Priority: P1 after soft-launch hardening; paid listings follow stable platform billing.

- [ ] Build a versioned, data-only theme package format.
- [ ] Refactor built-in presets to use a transactional installer with preview and rollback.
- [ ] Add operator-curated free theme uploads and marketplace browsing.
- [ ] Add creator submissions, moderation, versioning, reviews, and reporting.
- [ ] Add marketplace licenses, commissions, refunds, taxes, and creator payouts.

Detailed architecture, security requirements, phases, and acceptance criteria are documented in `THEME_MARKETPLACE_PLAN.md`.

## Recommended Order

1. Complete Phase 1 with three controlled tenants.
2. Complete live payments before advertising ecommerce capabilities.
3. Add SaaS billing and enforce plan limits.
4. Improve onboarding and domain setup.
5. Add analytics, support, and operational tooling.
6. Launch publicly after security, load, legal, and rollback reviews.
