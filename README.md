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

```text
http://localhost:3000/?site=<site-slug>
```

## Ecommerce Payment Mode

Checkout is currently positioned for manual/test payments, not production automated payment processing. Enabled methods can collect QR payment references or send sandbox/test provider requests, and merchants must verify payment before fulfillment. Do not market ecommerce as live card processing until live credentials, webhooks, reconciliation, refunds, and dispute handling are implemented and tested.

## Project Structure

```text
app/(site)/        Public tenant site routes
app/admin/         Authenticated admin dashboard
app/api/           Upload, AI, and payment API routes
components/admin/  Admin dashboard UI
components/site/   Public site UI and block renderers
components/ui/     Shared UI primitives
lib/actions/       Server actions by domain
lib/db/            Drizzle schema and PostgreSQL client
lib/               Auth, settings, tenant resolution, utilities
drizzle-pg/        PostgreSQL migrations
scripts/           Seed and maintenance scripts
```

## Current Notes

- The app is PostgreSQL-only.
- Public sites must be published before rendering.
- Rich text and custom HTML are sanitized before rendering.
- Page-builder changes are snapshotted so recent block edits can be restored from revision history.
- `npm run lint` currently passes with warnings only.
