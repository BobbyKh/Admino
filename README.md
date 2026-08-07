# Admino Web Builder

Admino is a multi-tenant website builder built with Next.js 16, React 19, Drizzle ORM, PostgreSQL, Tailwind CSS, and shadcn/ui.

## Features

- Multi-tenant public site rendering by domain, subdomain, or local `?site=<slug>` preview.
- Admin dashboard for sites, pages, homepage sections, navigation, settings, media, users, bookings, messages, blog posts, services, and ecommerce.
- Block-based page builder with configurable content, media, commerce, and interactive sections.
- PostgreSQL database managed with Drizzle migrations.
- Cloudinary media uploads with tenant-scoped media records.
- Optional AI chat using OpenAI-compatible, Anthropic, or Google providers.
- Basic ecommerce catalog, cart, checkout, manual/test payment configuration, orders, and inventory.

## Requirements

- Node.js 20+
- PostgreSQL database
- `DATABASE_URL` set to a `postgres://` or `postgresql://` connection string
- `AUTH_SECRET` for admin session signing

## Getting Started

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000` for the public site and `http://localhost:3000/admin/login` for the admin panel.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Required. |
| `AUTH_SECRET` | JWT signing secret for admin sessions. Required. |
| `ADMIN_EMAIL` | Admin email used by seed/reset scripts. |
| `ADMIN_PASSWORD` | Admin password used by seed/reset scripts. |
| `PLATFORM_DOMAIN` | Root tenant domain, for example `admino.com`. |
| `SITE_URL` | Fallback public URL for links, robots, and metadata. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name fallback. |
| `CLOUDINARY_API_KEY` | Cloudinary API key fallback. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret fallback. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP email settings fallback. |
| `COMMERCE_SECRETS_KEY` | Base64-encoded 32-byte key for encrypted payment secrets. |

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run reset-admin
```

## Tenant Routing

In production, tenants resolve by their configured `sites.domain`. Unknown production domains return no tenant instead of falling back to another site.

In local development, use:

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
