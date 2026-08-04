# Maiti Resort — Website + Admin CMS

A full-stack website for **Maiti Resort** (Kirtipur, Nepal) built with **Next.js 16 (App Router)**, **Drizzle ORM**, **shadcn/ui**, **Tailwind CSS v4**, and **Nodemailer (SMTP)**.

- 🌐 Public site: home, menu, gallery, table booking, contact — **SSR + ISR** for SEO (with sitemap, robots, JSON-LD structured data)
- 🔐 Admin panel (`/admin`): dashboard, CMS site-content editor, gallery manager, menu manager, bookings manager, message inbox
- 📤 **Image uploads via Cloudinary** — dynamic credentials from env vars, used in the gallery & menu managers
- 📧 Email system: booking confirmations to guests, booking alerts + contact notifications to admins
- 🗄️ **Dual-dialect database:** SQLite (`better-sqlite3`) locally, **PostgreSQL** (`pg`) in production — selected automatically from `DATABASE_URL`, managed with Drizzle ORM + drizzle-kit

## Database: SQLite (local) vs PostgreSQL (prod)

The app detects the driver from `DATABASE_URL`:

- **Local:** leave `DATABASE_URL` unset (or set it to a file path) → SQLite at `./maiti.db` via `better-sqlite3`.
- **Production:** set `DATABASE_URL=postgres://user:pass@host:5432/maiti` → the app and seed script automatically use **PostgreSQL** via `node-postgres`.

The schemas live in `lib/db/schema-sqlite.ts` and `lib/db/schema-postgres.ts` (identical tables); `lib/db/schema.ts` is a facade that picks the active dialect at runtime. drizzle-kit also branches on `DATABASE_URL` (`drizzle.config.ts`), so `db:push`/`db:generate` work for both.

## Cloudinary image uploads

Set your Cloudinary credentials in `.env.local` (read at runtime — change them anytime without redeploying):

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Then use the **Upload image** button in the admin **Gallery** / **Menu** managers — files are pushed to Cloudinary and the returned URL is stored. The URL field also remains available as a manual fallback. Images are served from `res.cloudinary.com` (whitelisted in `next.config.ts`).

> Without credentials the app still works — the upload button shows a clear error and you can paste any image URL instead.

> **Note:** SMTP password and Cloudinary API secret entered in the admin panel are stored in the app's `settings` table. The admin panel is auth-gated, but avoid using high-privilege credentials — or keep using env vars instead, which the app prefers when the matching setting is empty.

## Getting started

```bash
bun install          # or npm install
```

Set up the database and seed demo content:

```bash
bun run db:push      # create tables from the Drizzle schema
bun run db:seed      # seed admin user, settings, gallery photos, menu
bun run dev          # start the dev server → http://localhost:3000
```

### Seeded admin credentials

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `admin@maitiresort.com`   |
| Password | `maiti2024`               |

Log in at **http://localhost:3000/admin/login**. Change these via the `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars before re-running the seed.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable              | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string |
| `AUTH_SECRET`         | JWT signing secret for admin sessions (**required in production**) |
| `ADMIN_EMAIL`         | Admin login email used by the seed script           |
| `ADMIN_PASSWORD`      | Admin login password used by the seed script        |
| `SMTP_HOST`           | SMTP server host (e.g. `smtp.gmail.com`)            |
| `SMTP_PORT`           | SMTP port (default `587`)                           |
| `SMTP_SECURE`         | `true` for SSL/TLS, `false` for STARTTLS            |
| `SMTP_USER`           | SMTP username                                       |
| `SMTP_PASS`           | SMTP password / app password                        |
| `SMTP_FROM`           | From address for outgoing mail                      |
| `ADMIN_NOTIFY_EMAIL`  | Where booking alerts & contact messages go          |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (image uploads)              |
| `CLOUDINARY_API_KEY`   | Cloudinary API key                                 |
| `CLOUDINARY_API_SECRET`| Cloudinary API secret                              |
| `SITE_URL`            | Public site URL (used in email links + sitemap)     |
| `PLATFORM_DOMAIN`     | Root tenant domain, e.g. `admino.com`               |

> **Email without SMTP:** if `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are empty, the app still works — emails are logged to the server console instead of being sent, so you can develop without an email account.

## Tenant subdomains

Set `PLATFORM_DOMAIN=admino.com` in production. New sites are then assigned
`<site-slug>.admino.com` automatically, for example `maiti-resort.admino.com`.

Configure your DNS provider with a wildcard record that points at the application:

```text
Type: CNAME
Host: *
Value: your-deployment-hostname
```

Also configure the root domain and add `*.admino.com` as a wildcard domain in your
hosting provider. On localhost, tenant previews remain available at
`http://localhost:3000/?site=<site-slug>`.

## Homepage Builder

Each new tenant receives a published **Home** page with editable Hero and Features
blocks. Manage it from **Admin → Pages → Home → Blocks**; create additional pages
from the same Pages screen. To add the default Home page to existing tenants, run:

```bash
npm run db:provision-homepages
```

### Gmail example

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-app-password
```

## Scripts

```bash
bun run dev           # dev server
bun run build         # production build
bun run start         # production server
bun run lint          # ESLint
bun run db:generate   # generate a new Drizzle migration
bun run db:push       # push schema changes to SQLite
bun run db:seed       # seed / update demo content (idempotent)
```

## Project structure

```
app/
  (site)/              # public pages (home, menu, gallery, book, contact)
  admin/
    login/             # admin login (unprotected)
    (panel)/           # protected admin pages: dashboard, bookings, messages, menu, gallery, settings
  sitemap.ts           # SEO sitemap
  robots.ts            # SEO robots.txt
components/
  site/                # navbar, footer, booking form, gallery filter, contact form
  admin/               # admin sidebar, CMS forms, gallery/menu management
  ui/                  # shadcn/ui components
lib/
  db/
    schema-sqlite.ts    # SQLite schema (canonical, local dev)
    schema-postgres.ts  # PostgreSQL schema (production)
    schema.ts           # dialect facade — app imports from here
    client.ts           # unified async db client (sqlite local / pg prod)
  actions.ts           # public + admin server actions (bookings, messages)
  cms-actions.ts       # admin CMS actions (settings, gallery, menu, uploads)
  cloudinary.ts        # Cloudinary SDK helper (dynamic env credentials)
  auth.ts              # JWT session auth (jose + bcryptjs)
  email.ts             # Nodemailer SMTP helpers
  data.ts              # cached data access for public pages
  settings.ts          # CMS settings model + defaults
scripts/seed.ts        # seed script (dialect-aware, async)
```

## Architecture notes

- **ISR for SEO:** public pages are statically prerendered at build; `/`, `/menu`, `/gallery` revalidate every 5 minutes (`export const revalidate = 300`). Admin edits call `revalidatePath()` so content updates on demand.
- **Admin is dynamic:** every `/admin` page (except login) runs `requireAdmin()` and is server-rendered per request.
- **Server Actions** handle all mutations with zod validation; admin mutations re-check the session server-side.
- **Uploads:** the gallery & menu managers upload images to Cloudinary via a server action (10 MB limit, `image/*` only); URLs can also be pasted manually.

```
