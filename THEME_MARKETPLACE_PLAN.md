# Admino Theme Marketplace Plan

## Goal

Allow creators and platform operators to upload reusable themes, let merchants preview them against demo or existing site content, and install, update, or roll back themes safely.

The first release must support data-only themes. Theme packages may contain JSON configuration and static assets, but no executable JavaScript, React components, server code, database migrations, or arbitrary CSS imports.

## Product Definitions

### Theme

A visual design package containing:

- Color and typography tokens.
- Header and footer settings.
- Component appearance settings.
- Optional safe custom CSS variables and declarations.
- Preview images and marketing metadata.

A theme changes presentation without replacing site content.

### Template

A site structure package containing:

- Pages and page metadata.
- Ordered page blocks and validated block configuration.
- Navigation structure.
- Optional default settings and placeholder media.
- Required Admino features and minimum platform version.

A template can create or replace content after explicit confirmation.

### Theme Bundle

A marketplace item that can contain both a visual theme and a site template. Merchants must be able to install only the visual theme or the complete bundle.

## Current Architecture Gaps

The existing implementation in `lib/templates.ts` and `applyTemplatePreset` has these limitations:

- Presets are compiled into the application and cannot be uploaded.
- Installation requires `super_admin` instead of allowing an authorized tenant admin.
- Applying a preset can append duplicate blocks to an existing page.
- There is no preview, snapshot, rollback, version, ownership, moderation, or compatibility check.
- Theme tokens and template content do not have a versioned package schema.
- Marketplace assets, purchases, licenses, reviews, and creator payouts do not exist.

These gaps must be addressed before accepting third-party uploads.

## Package Format

Use a ZIP archive with this structure:

```text
theme-package.zip
├── manifest.json
├── theme.json
├── template.json
├── preview/
│   ├── cover.webp
│   ├── desktop.webp
│   └── mobile.webp
└── assets/
    ├── hero.webp
    └── logo-placeholder.png
```

Only `manifest.json` and `theme.json` are required for a visual-only theme.

### Manifest

```json
{
  "schemaVersion": 1,
  "id": "creator.modern-commerce",
  "name": "Modern Commerce",
  "version": "1.0.0",
  "description": "A clean storefront theme",
  "category": "ecommerce",
  "author": {
    "name": "Creator Name",
    "url": "https://creator.example"
  },
  "minAdminoVersion": "0.2.0",
  "requiredFeatures": ["commerce", "pages"],
  "license": "commercial",
  "entrypoints": {
    "theme": "theme.json",
    "template": "template.json"
  }
}
```

### Theme Rules

- Validate every theme token against an allowlist.
- Allow approved font families or externally hosted fonts from approved providers only.
- Reject `url()`, `@import`, `expression`, scripts, event handlers, and unknown CSS properties.
- Enforce contrast checks for primary foreground/background combinations.
- Limit custom CSS size and parse it rather than relying only on regular expressions.

### Template Rules

- Validate every page, slug, block type, and block configuration with Zod.
- Reject unknown block types and unsafe JSON keys.
- Limit page count, blocks per page, text length, nested array size, and total package size.
- Rewrite package asset references to platform-controlled Cloudinary URLs after upload.
- Never trust package-provided tenant IDs, record IDs, timestamps, or publication status.
- Install content as draft by default.

## Required Data Model

### Creators

- `marketplace_creators`: user, display name, profile, verification status, payout account, created date.

### Listings

- `marketplace_listings`: creator, slug, title, description, category, type, status, price, currency, featured status.
- `marketplace_listing_versions`: listing, semantic version, manifest, package storage key, checksum, compatibility, review status, changelog.
- `marketplace_assets`: listing version, asset type, URL, width, height, size, checksum.

### Installation And Ownership

- `marketplace_licenses`: listing, buyer/tenant, order, license type, status, purchase date.
- `theme_installations`: site, listing version, installation mode, active status, installed by, installed date.
- `theme_install_snapshots`: installation, site snapshot, checksum, expiration date.

### Marketplace Trust

- `marketplace_reviews`: listing, customer, rating, body, verified purchase, moderation status.
- `marketplace_reports`: listing/review, reporter, reason, status, resolution.
- `marketplace_audit_logs`: actor, action, target, metadata, timestamp.

Add foreign keys, unique constraints, tenant indexes, and soft-delete/status fields where required.

## Core Merchant Features

### Browse And Discovery

- Marketplace landing page.
- Search by name, creator, and keyword.
- Filters for category, free/paid, industry, features, rating, and compatibility.
- Sort by featured, newest, rating, popularity, and price.
- Responsive desktop and mobile preview screenshots.
- Theme detail page with changelog, supported features, requirements, license, and reviews.

### Preview

- Preview with marketplace demo content.
- Preview against a safe copy of the merchant's current site data.
- Desktop, tablet, and mobile viewport controls.
- Compare current theme and candidate theme.
- Preview must not write to production tables.

### Installation

- Choose `Visual theme only`, `Add missing pages`, or `Replace site structure`.
- Show a complete impact summary before confirmation.
- Create a transactional snapshot before making changes.
- Map package asset references to uploaded assets.
- Prevent duplicate pages and blocks using stable package keys.
- Preserve merchant products, orders, customers, bookings, and domain settings.
- Install pages as drafts unless the merchant explicitly publishes them.
- Record installer identity and package checksum in the audit log.

### Rollback And Updates

- One-click rollback to the pre-install snapshot.
- Keep a limited snapshot history per site and plan.
- Show available theme versions and changelogs.
- Distinguish safe visual updates from content-changing updates.
- Require confirmation for breaking or content-replacing updates.
- Detect merchant-customized fields and show conflicts before overwriting.

## Creator Features

- Creator registration and profile management.
- Upload ZIP package with progress and validation results.
- Draft listing editor with screenshots, description, category, price, support URL, and license.
- Automated validation report with actionable errors.
- Submit for moderation.
- Version upload and changelog management.
- Sales, installs, conversion, refund, rating, and payout dashboard.
- Listing deprecation and support lifecycle controls.

## Platform Operator Features

- Moderation queue for new listings and versions.
- Automated malware, archive, image, JSON, HTML, CSS, and URL scans.
- Manual preview and installation test in an isolated tenant.
- Approve, reject, suspend, feature, or remove listings.
- Creator verification and payout controls.
- Refund, dispute, abuse report, and copyright complaint workflows.
- Marketplace commission and tax configuration.
- Download, install, failure, and conversion analytics.
- Emergency disable switch for a listing or version.

## Security Requirements

- Never execute package code during validation, preview, or installation.
- Reject symlinks, path traversal, nested archives, executable files, and archive bombs.
- Enforce compressed and extracted size limits.
- Verify MIME signatures rather than trusting file extensions.
- Store immutable packages with SHA-256 checksums.
- Scan every outbound URL and reject local, private, metadata, and non-HTTPS targets.
- Sanitize HTML in template content before persistence and rendering.
- Run package processing in an isolated background worker with CPU, memory, and time limits.
- Require tenant access and suitable role checks for preview, purchase, install, update, and rollback.
- Keep marketplace payments separate from tenant storefront payments.
- Audit every moderation, purchase, installation, update, and rollback operation.

## Marketplace Payments

Start with free themes before enabling paid listings.

Paid marketplace requirements:

- Marketplace order and payment records separate from storefront orders.
- Platform commission and creator net amount.
- Tax/VAT handling based on seller and buyer location.
- Refund window and refund eligibility rules.
- Stripe Connect or another marketplace payout provider.
- Creator onboarding, identity verification, payout schedule, and failed payout handling.
- License issuance only after verified payment.
- Chargeback handling and license suspension policy.

## Implementation Phases

### Phase A: Internal Theme Registry

Priority: P0

- [ ] Define versioned Zod schemas for manifests, visual themes, templates, and assets.
- [ ] Move hardcoded presets into the new package representation.
- [ ] Refactor installation into a transactional service.
- [ ] Add install modes, stable package keys, snapshots, and rollback.
- [ ] Allow tenant admins with site-management permission to install approved themes.
- [ ] Add compatibility and required-feature checks.
- [ ] Add tests for duplicate prevention, rollback, tenant isolation, and invalid packages.

Exit criteria: built-in themes use the same safe installer that marketplace themes will use.

### Phase B: Operator Uploads And Free Marketplace

Priority: P0

- [ ] Add listing, version, asset, installation, and snapshot tables.
- [ ] Build operator-only package upload and validation.
- [ ] Store packages and preview assets in private object storage.
- [ ] Build marketplace browse, details, preview, install, and rollback UI.
- [ ] Add moderation status and audit logs.
- [ ] Release only free, platform-curated themes.

Exit criteria: an operator can upload a data-only theme and a merchant can preview, install, and roll it back without engineering access.

### Phase C: Third-Party Creators

Priority: P1

- [ ] Add creator accounts, listing editor, validation reports, and moderation workflow.
- [ ] Add versioning, changelogs, deprecation, reviews, reports, and support links.
- [ ] Process packages in an isolated background worker.
- [ ] Add creator and marketplace analytics.

Exit criteria: approved creators can submit updates without access to platform code or tenant data.

### Phase D: Paid Marketplace

Priority: P1

- [ ] Add marketplace checkout, licenses, commissions, refunds, and invoices.
- [ ] Integrate creator identity verification and payouts.
- [ ] Add tax handling, chargebacks, payout reconciliation, and finance exports.
- [ ] Enforce active licenses for paid downloads and updates.

Exit criteria: payments, licenses, refunds, commissions, and payouts reconcile exactly and are auditable.

## Recommended First Release

Build a curated free marketplace before accepting public creator uploads:

1. Refactor the existing presets into versioned data-only packages.
2. Add safe preview, installation snapshots, and rollback.
3. Add operator-only uploads and moderation.
4. Publish five to ten high-quality free themes.
5. Observe installation failures and support demand.
6. Open creator submissions only after the package validator and rollback process are proven.
7. Add paid listings only after platform SaaS billing and payment operations are stable.

## MVP Acceptance Criteria

- Invalid or malicious archives are rejected without extracting unsafe files.
- A theme cannot execute code or access server environment variables.
- A merchant can preview a theme without changing the live site.
- Installation never changes another tenant's records.
- Products, customers, orders, bookings, domains, and payment settings survive template installation.
- Reinstalling the same version does not duplicate pages or blocks.
- Failed installation rolls back atomically.
- A merchant can restore the pre-install snapshot.
- Every installation records actor, tenant, version, checksum, mode, and result.
