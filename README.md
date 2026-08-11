# Admino — Multi-Tenant Website Builder

> A fully-featured, self-hosted SaaS website builder for hospitality and service businesses — built with Next.js 16, React 19, Drizzle ORM, PostgreSQL, Tailwind CSS v4, and shadcn/ui.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Tenant Routing](#tenant-routing)
- [Role-Based Access Control](#role-based-access-control)
- [Tenant Feature Gating](#tenant-feature-gating)
- [Payment Mode](#payment-mode)
- [Development Phases](#development-phases)
- [Current Limitations](#current-limitations)

---

## Overview

Admino lets you host multiple independent websites (tenants) from a single deployment. Each tenant gets an isolated admin panel, content management tools, block-based page builder, e-commerce catalog, AI tools, and booking/reservation management — all scoped by `siteId` with zero data leakage between tenants.

Built for:
- 🍽️ Restaurants & Cafés (menu, bookings, gallery)
- 🏨 Resorts & Hotels (services, bookings, blog, gallery)
- 🛍️ Service Businesses (service catalog, contact messages, blog)
- 🏢 Agencies managing multiple client sites

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL (Drizzle ORM) |
| Auth | JWT via `jose`, bcrypt passwords |
| Media | Cloudinary (tenant-scoped) |
| Email | Nodemailer (per-tenant SMTP) |
| AI | OpenAI / Anthropic / Google (configurable) |
| Animations | Framer Motion |
| Charts | Recharts |
| Validation | Zod |

---

## Features

### 🏗️ Platform
- Multi-tenant architecture — every resource is scoped to a `siteId`
- Domain/subdomain routing with DNS verification tracking
- Role-based access control (4 tiers)
- Per-tenant AND per-user feature gating
- Full activity audit log with IP tracking
- Page revision history with snapshot/restore

### 📝 Content Management
- Block-based page builder with autosave and preview
- Homepage sections editor
- Blog post management with categories, excerpts, and scheduled publishing
- Services catalog with category grouping
- Navigation menu builder
- Photo gallery with categories and featured flags
- Media library (Cloudinary-backed, tenant-scoped)

### 🛒 E-Commerce
- Product catalog with sizes, colors, and inventory
- Cart and checkout flow
- Order management (pending → paid → fulfilled → cancelled)
- Manual/QR payment reference collection (see [Payment Mode](#payment-mode))
- Payment configuration per tenant

### 🍽️ Hospitality
- Menu categories and items with pricing, images, availability
- Booking/reservation management (date, time, guests, occasion, status)
- Contact message inbox with read/unread tracking

### 🤖 AI Tools
- AI Theme Generator — generates color palettes and typography using LLMs
- AI Block Assistant — generates page block content and layouts

### 🔐 Security
- DB-backed rate limiting (login, can be extended to any endpoint)
- Upload content-signature validation, SVG rejection, folder sanitization
- HTML sanitization via `isomorphic-dompurify` before rendering
- HTTP-only cookies, secure in production, `sameSite: lax`
- Password reset with hashed token + expiry

---

## Getting Started

### Prerequisites

- Node.js 20+ (or Bun)
- PostgreSQL database
- Cloudinary account (for media uploads)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd admino

# Install dependencies
npm install
# or
bun install
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed initial admin user and demo data
npm run db:seed
```

### Start Development Server

```bash
npm run dev
# or
bun dev
```

| URL | Purpose |
|---|---|
| `http://localhost:3000` | Public tenant site |
| `http://localhost:3000/admin/login` | Admin panel login |
| `http://localhost:3000/?site=<slug>` | Preview a specific tenant site locally |

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Required ────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/admino
AUTH_SECRET=your-32-char-minimum-random-secret

# ── Admin Seed / Reset ──────────────────────────────────
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-admin-password

# ── Platform ────────────────────────────────────────────
PLATFORM_DOMAIN=admino.com          # Root domain for multi-tenant routing
SITE_URL=https://admino.com         # Fallback public URL for metadata/robots

# ── Media (Cloudinary) ──────────────────────────────────
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ── Email (SMTP) ─────────────────────────────────────────
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-smtp-password

# ── Commerce ─────────────────────────────────────────────
COMMERCE_SECRETS_KEY=base64-encoded-32-byte-key   # For encrypted payment secrets

# ── AI (optional, pick one or more) ─────────────────────
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

> **Note**: SMTP and Cloudinary can also be configured per-tenant from the admin panel under **Settings → Email** and **Settings → Media**.

---

## Scripts

```bash
npm run dev                              # Start development server
npm run build                            # Production build
npm run start                            # Start production server
npm run lint                             # Run ESLint
npm run test                             # Run unit tests

npm run db:generate                      # Generate Drizzle migration files
npm run db:migrate                       # Apply migrations to database
npm run db:push                          # Push schema changes (dev only)
npm run db:seed                          # Seed initial data
npm run db:provision-homepages           # Provision homepage sections for all sites
npm run db:provision-ecommerce-templates # Provision default e-commerce templates
npm run reset-admin                      # Reset admin user credentials
```

---

## Project Structure

```
admino/
├── app/
│   ├── (site)/            # Public tenant site routes (SSR by domain/slug)
│   ├── admin/             # Authenticated admin dashboard
│   │   ├── login/         # Login, forgot-password, reset-password pages
│   │   └── (panel)/       # Protected admin panel routes
│   │       ├── page.tsx   # Dashboard overview & analytics
│   │       ├── sites/     # Tenant site management
│   │       ├── pages/     # Page builder & management
│   │       ├── homepage/  # Homepage sections editor
│   │       ├── navigation/# Nav link management
│   │       ├── menu/      # Food/service menu management
│   │       ├── bookings/  # Reservation management
│   │       ├── messages/  # Contact message inbox
│   │       ├── blog/      # Blog post management
│   │       ├── services/  # Service catalog
│   │       ├── commerce/  # Products, orders, payments
│   │       ├── media/     # Media library
│   │       ├── gallery/   # Photo gallery
│   │       ├── users/     # User & role management
│   │       ├── settings/  # Site settings & SMTP config
│   │       ├── activity/  # Audit log viewer
│   │       ├── export/    # Data export
│   │       └── onboarding/# Setup wizard
│   └── api/               # Upload, AI, and payment API routes
│
├── components/
│   ├── admin/             # Admin dashboard UI components
│   ├── site/              # Public site block renderers
│   └── ui/                # Shared shadcn/ui primitives
│
├── lib/
│   ├── actions/           # Server actions by domain
│   ├── db/                # Drizzle schema and PostgreSQL client
│   ├── commerce/          # Payment provider logic
│   ├── auth.ts            # JWT sessions, RBAC, role guards
│   ├── tenant-features.ts # Feature gating logic (server)
│   ├── tenant-features-constants.ts  # Feature catalog (client-safe)
│   ├── email.ts           # Transactional email (booking, order, password reset)
│   ├── rate-limit.ts      # DB-backed rate limiting
│   ├── sanitize.ts        # HTML sanitization (DOMPurify)
│   ├── upload-validation.ts # Upload security (content-sig, SVG, MIME)
│   ├── blocks.ts          # Block type registry and config
│   ├── settings.ts        # Tenant settings resolution
│   └── cloudinary.ts      # Cloudinary upload helpers
│
├── drizzle-pg/            # PostgreSQL migration files
├── scripts/               # Seed and maintenance scripts
└── tests/                 # Unit tests
```

---

## Tenant Routing

### Production

Tenants resolve by the `domain` column in the `sites` table. Configure a wildcard DNS record pointing to your server:

```
*.admino.com  →  your-server-ip
```

Each tenant sets their custom domain in **Admin → Settings → Domain**. The platform then routes incoming requests to the correct tenant.

Unknown domains in production return no tenant (no fallback to another site).

### Local Development

Use the `?site=<slug>` query parameter to preview any tenant:

```
http://localhost:3000/?site=my-restaurant
```

---

## Role-Based Access Control

Four roles are supported, with hierarchical permissions:

| Role | Permissions |
|---|---|
| `viewer` | Read-only access |
| `editor` | Read + write content |
| `admin` | Full content + manage users |
| `super_admin` | All permissions + site management + delete |

Roles are assigned per-user. A `super_admin` has access to all tenants; other roles are scoped to their assigned `siteId`.

---

## Tenant Feature Gating

Features can be enabled/disabled per tenant by a `super_admin` in **Admin → Sites → [Site] → Features**:

| Category | Features |
|---|---|
| Site Management | Pages & Blocks, Navigation, Header/Footer Layout, Site Settings |
| Content | Bookings, Contact Messages, Menu, Gallery, Media Library, Services, Blog |
| Commerce | E-Commerce (products, orders, payments) |
| AI Tools | AI Theme Generator, AI Block Assistant |

Additionally, each user within a tenant can be granted a restrictive feature subset — if a user has explicit grants, they can only access those features; otherwise they inherit all site-enabled features.

---

## Payment Mode

> ⚠️ **E-commerce checkout is currently manual/test-payment only.**

Enabled payment methods collect QR payment references or send sandbox provider requests. Merchants must **manually verify** payment before fulfilling orders.

**Do not advertise live automated card processing until the following are implemented:**
- Live Stripe / payment provider credentials and webhooks
- Reconciliation and settlement flows
- Refund and dispute handling
- PCI-DSS compliance review

See [Phase 2](#phase-2--payments--billing-8-10-weeks) below for the roadmap.

---

## Development Phases

This section tracks the project's progression from internal tool to public SaaS product.

---

### ✅ Phase 0 — MVP Foundation *(Completed)*

The initial working system was built and deployed for internal use.

**Completed:**
- [x] Multi-tenant data model (sites, pages, blocks, media, users, settings, products, carts, orders)
- [x] Block-based page builder with autosave and revision history
- [x] Admin dashboard with analytics charts (bookings, messages)
- [x] Role-based access control (4 tiers) with JWT session auth
- [x] Cloudinary media uploads with tenant scoping
- [x] Transactional email (bookings, orders, password reset) via SMTP
- [x] E-commerce catalog, cart, and checkout (manual payment mode)
- [x] AI theme generator and AI block assistant
- [x] Rate-limited admin login
- [x] Upload hardening (content-sig validation, SVG rejection, folder sanitization)
- [x] HTML sanitization via DOMPurify
- [x] Full activity audit log
- [x] Page revision snapshots with restore controls
- [x] Per-tenant feature gating
- [x] Per-user feature grant overlay
- [x] Password reset with token expiry
- [x] Production build passes with lint warnings only

---

### 🔧 Phase 1 — Security & Reliability *(In Progress — Target: 6–8 weeks)*

Harden the platform to a level suitable for serving paying customers and passing a security audit.

**Goals:**
- Bring test coverage to a level that allows confident releases
- Eliminate security gaps before accepting untrusted customer content
- Clean up client-specific branding artifacts

**Tasks:**
- [ ] Fix hardcoded client branding (`maiti_admin_session` cookie name, `maitiresort.com` email defaults)
- [ ] Add HTTP security headers in `next.config.ts` (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] Extend rate limiting to AI endpoints, upload endpoints, and public form submissions (bookings, contact)
- [ ] Full multi-tenant security audit — verify all server actions enforce `siteId` scoping
- [ ] Expand unit test suite to cover all server actions (target: 80% coverage)
- [ ] Write 20+ end-to-end test scenarios: login, site creation, page builder, publishing, uploads, checkout, tenant isolation
- [ ] Confirm `sameSite: strict` vs `lax` cookie policy for admin sessions
- [ ] CSRF review for server actions
- [ ] Document security architecture decisions

---

### 💳 Phase 2 — Payments & Billing *(Planned — Target: 8–10 weeks)*

Enable real revenue — both for tenant customers (e-commerce) and for the platform operator (SaaS subscriptions).

**Tenant E-Commerce Payments:**
- [ ] Stripe Connect integration — live card processing, webhooks, refunds, disputes
- [ ] Khalti payment provider (Nepal market)
- [ ] eSewa payment provider (Nepal market)
- [ ] ConnectIPS / bank transfer support
- [ ] Payment webhook handlers and reconciliation
- [ ] Order fulfillment workflow tied to payment confirmation
- [ ] Refund management UI in admin panel
- [ ] PCI-DSS review and documentation

**Platform SaaS Billing (Operator Revenue):**
- [ ] Define subscription tiers (Starter / Growth / Business / Agency)
- [ ] Stripe Billing integration for tenant subscriptions
- [ ] Plan limit enforcement (site count, storage, feature access)
- [ ] Trial period logic (e.g., 14-day free trial)
- [ ] Billing portal for tenant self-service (upgrade, cancel, invoices)
- [ ] Usage metering (storage, AI calls)
- [ ] Automated downgrade/suspension on payment failure

---

### 🚀 Phase 3 — Growth & Acquisition *(Planned — Target: 6–8 weeks)*

Add features that improve customer acquisition, retention, and operator revenue.

**Onboarding:**
- [ ] Guided site setup wizard (create → template → content → domain → publish)
- [ ] In-app setup checklist with progress tracking
- [ ] Empty-state UI with helpful prompts in every admin section

**Domain Management:**
- [ ] Automated DNS TXT/CNAME verification polling
- [ ] SSL provisioning status tracking
- [ ] Customer-facing domain setup guide (step-by-step)

**Analytics:**
- [ ] Page view analytics integration (Plausible Analytics or PostHog)
- [ ] E-commerce conversion funnel (revenue, AOV, abandoned carts)
- [ ] Traffic source breakdown
- [ ] Analytics data export

**Templates & Marketplace:**
- [ ] 5–10 industry-specific starter templates (restaurant, resort, salon, retail, portfolio)
- [ ] Template preview on public marketing site
- [ ] One-click template apply on site creation

**White-Labeling (Agency tier):**
- [ ] Custom admin panel branding per tenant (logo, colors)
- [ ] Remove "Powered by Admino" branding option

---

### 🌍 Phase 4 — Public Launch *(Planned)*

Take the product to market with proper go-to-market infrastructure.

- [ ] Marketing / landing page (`admino.com`)
- [ ] Public documentation / help center (Mintlify or Docusaurus)
- [ ] Blog / case studies for SEO
- [ ] Product Hunt launch
- [ ] Referral and affiliate program
- [ ] Developer API (public REST API for headless usage)
- [ ] Zapier / Make integration for workflow automation
- [ ] Community forum or Discord for tenant customers

---

## Current Limitations

| Limitation | Planned Fix |
|---|---|
| E-commerce payments are manual/test-only | Phase 2 — Stripe Connect + local payment providers |
| No SaaS billing for operator | Phase 2 — Stripe Billing for tenant subscriptions |
| Test coverage is limited (3 unit test files) | Phase 1 — expand to 80% + 20 e2e scenarios |
| No automated DNS/SSL provisioning UI | Phase 3 — domain management module |
| No page analytics | Phase 3 — Plausible / PostHog integration |
| Hardcoded client branding in some internals | Phase 1 — remove before any public release |
| Database is PostgreSQL-only | No change planned (intentional) |
| No public API | Phase 4 — headless REST API |

---

## Contributing

```bash
# Fork and clone
git clone <your-fork>

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, then run lint and tests
npm run lint
npm run test

# Open a pull request
```

Please ensure:
- All new server actions enforce `siteId` scoping
- New features include at least one unit test
- No hardcoded tenant-specific values

---

## License

Private — All rights reserved. Contact the repository owner for licensing inquiries.
