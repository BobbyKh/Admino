/**
 * Admin & developer documentation content for the Admino platform.
 * Rendered by the /admin/docs hub and the public /help + /faq pages.
 */

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "steps"; title: string; items: string[] }
  | { type: "tip"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface DocArticle {
  id: string;
  title: string;
  summary: string;
  href?: string;
  blocks: DocBlock[];
}

export interface DocCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  articles: DocArticle[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "Rocket",
    description: "Launch a new site, set up branding, and go live.",
    articles: [
      {
        id: "create-site",
        title: "Create a site",
        summary: "Provision a new tenant with starter content in one flow.",
        href: "/admin/sites",
        blocks: [
          { type: "p", text: "Admins with the super_admin role can create a new site from the Sites page or the dedicated onboarding flow." },
          { type: "steps", title: "To create a site", items: [
            "Go to Admin → Sites → Create site.",
            "Enter the site name, slug, and choose a starter template (Blank, Restaurant, Portfolio, Business, Blog, E-commerce, or Landing Page).",
            "Fill in the description and an optional custom domain.",
            "On the next step, add branding: tagline, logo, and favicon.",
            "Add contact details (email, notify email, phone, address).",
            "Enable the feature plan (Pages, Commerce, Blog, AI tools, etc.).",
            "Submit. You'll be taken to the Pages editor to start building.",
          ]},
          { type: "tip", text: "A site can be previewed before publishing. Switch sites with the Site selector in the admin sidebar." },
          { type: "p", text: "Onboarding also seeds starter content and a launch checklist baseline so new sites have sensible defaults." },
        ],
      },
      {
        id: "launch-checklist",
        title: "Launch checklist",
        summary: "What to verify before sending your site live.",
        href: "/admin/sites",
        blocks: [
          { type: "p", text: "The Sites page shows a publish-readiness score per site. Aim for every check to be complete before launch." },
          { type: "ul", items: [
            "Identity: site name, tagline, description, logo set.",
            "Contact: phone, email, and address present (used in footer and notifications).",
            "Homepage: at least one content block on the home page.",
            "Pages: core pages (About, Contact, Menu/Products) created.",
            "Navigation: nav links added to the header.",
            "Domain: custom domain configured and verified (optional).",
            "Commerce: products and a payment method configured (only if using e-commerce).",
          ]},
          { type: "steps", title: "Final go-live steps", items: [
            "Open Site Settings and confirm the SEO description and social metadata.",
            "Publish every page you want public from the Pages list.",
            "Preview the site via the 'View site' link in the admin sidebar.",
            "On the Sites page, confirm the domain status is healthy.",
            "Enable AI chat or RAG assistant in Settings → AI if you want the storefront assistant.",
          ]},
          { type: "tip", text: "Use the AI Site Auditor to catch SEO, content, and commerce issues before you launch." },
        ],
      },
    ],
  },
  {
    id: "content",
    label: "Pages & Content",
    icon: "FileText",
    description: "Build pages with blocks, publish blogs, galleries, menus, and services.",
    articles: [
      {
        id: "pages-blocks",
        title: "Pages & blocks",
        summary: "How pages and their content blocks work.",
        href: "/admin/pages",
        blocks: [
          { type: "p", text: "Every page is a container for 'blocks' — reusable content sections like heroes, feature grids, text, FAQ, product grids, and contact forms." },
          { type: "ol", items: [
            "Open Admin → Pages and click New Page.",
            "Give the page a title; a URL slug is generated automatically.",
            "Add SEO metadata (meta title, description, optional OG image, canonical URL, noindex).",
            "Save, then open the page editor.",
            "Click Add Block and pick a type. Fill in the block's fields.",
            "Reorder blocks by dragging, toggle visibility, or delete.",
            "Publish the page when ready.",
          ]},
          { type: "p", text: "Blocks store their content as JSON. The editor validates each field against the block type's schema before saving." },
          { type: "tip", text: "Revisions are snapshotted on every block change. Open Revisions to diff or restore an earlier version." },
        ],
      },
      {
        id: "block-types",
        title: "Block type reference",
        summary: "The 30+ block types available in the page editor.",
        href: "/admin/pages",
        blocks: [
          { type: "p", text: "Blocks are grouped by purpose:" },
          { type: "ul", items: [
            "Layout: Hero Banner, Spacer, Divider, Columns.",
            "Content: Text, Rich Text, Features, FAQ, Image, Video, CTA Banner, Map.",
            "Media: Gallery, Video, Image with caption.",
            "Commerce: Product Grid, Product Card.",
            "Interactive: Contact Form, Booking Form, Newsletter, Menu, Services.",
          ]},
          { type: "p", text: "Each block has a default config so it renders immediately after being added. Use the AI Block Assistant to rewrite a block's content from a text instruction." },
        ],
      },
      {
        id: "blog",
        title: "Blog",
        summary: "Publish articles with AI-assisted writing.",
        href: "/admin/blog",
        blocks: [
          { type: "steps", title: "Create a blog post", items: [
            "Open Admin → Blog → New Post.",
            "Enter a title, excerpt, and cover image.",
            "Write the body with the rich-text editor.",
            "Optionally use the AI writer to draft a full post from a topic and tone.",
            "Set the category and publish (or save as draft).",
          ]},
          { type: "p", text: "Posts render at /blog and /blog/[slug]. The homepage can show recent posts via a Blog block." },
        ],
      },
      {
        id: "gallery-media",
        title: "Gallery & media",
        summary: "Upload and organize images used across the site.",
        href: "/admin/media",
        blocks: [
          { type: "ul", items: [
            "Media Library: upload images/videos, organize into folders, set alt text.",
            "Gallery: curate a public photo gallery with categories and featured images.",
            "Alt text is important for accessibility and SEO — set it on every image.",
            "Images can also be AI-generated from the Media page (requires OpenAI as provider).",
          ]},
        ],
      },
      {
        id: "menu-services",
        title: "Menu & services",
        summary: "Showcase offerings with prices and descriptions.",
        href: "/admin/menu",
        blocks: [
          { type: "p", text: "The Menu module lets you manage food/drink categories and items with prices, images, and availability. Service categories and services work the same way for service businesses." },
          { type: "p", text: "Featured items and categories can be surfaced on the homepage through Menu/Services blocks." },
        ],
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: "ShoppingBag",
    description: "Products, orders, payments, and customers.",
    articles: [
      {
        id: "products",
        title: "Products",
        summary: "Add and manage store inventory.",
        href: "/admin/commerce/products",
        blocks: [
          { type: "steps", title: "Add a product", items: [
            "Open Admin → Commerce → Products → New Product.",
            "Set title, slug, price (in your currency's minor units), and description.",
            "Add an image, category, sizes, and colors.",
            "Set inventory quantity and status (draft/active/archived).",
            "Mark as featured to highlight it on the homepage.",
            "Save. Use the AI Product Description generator to write a sales description.",
          ]},
          { type: "tip", text: "Prices are stored in minor units (cents/paisa). $12.50 is entered as 1250." },
        ],
      },
      {
        id: "orders",
        title: "Orders & fulfillment",
        summary: "Track, fulfill, and refund orders.",
        href: "/admin/commerce/orders",
        blocks: [
          { type: "p", text: "Orders appear as customers check out. Each order shows items, totals, customer details, and payment status." },
          { type: "ol", items: [
            "Review new orders in Commerce → Orders.",
            "Approve or reject awaiting-verification payments.",
            "Update the status as you process it (paid → fulfilled).",
            "Useful actions are available per order, including fulfill and cancel.",
          ]},
          { type: "p", text: "Stock is decremented at checkout. Use the AI Demand Forecast to predict when to reorder." },
        ],
      },
      {
        id: "payments",
        title: "Payments",
        summary: "Configure Stripe, eSewa, and QR payment methods.",
        href: "/admin/commerce/payments",
        blocks: [
          { type: "ul", items: [
            "Stripe: set API keys and webhook secret for card payments.",
            "eSewa: merchant credentials for the Nepal wallet.",
            "QR/other providers for local payments.",
            "Payment configuration is stored encrypted; the public storefront only knows which providers are enabled.",
          ]},
          { type: "tip", text: "Stripe webhooks are verified with a signature. Point Stripe to /api/payments/stripe/webhook." },
        ],
      },
      {
        id: "customers",
        title: "Customers",
        summary: "Manage customer accounts and activity.",
        href: "/admin/customers",
        blocks: [
          { type: "p", text: "Customers register on the storefront. Admins can search customers, view stats, edit details, and delete accounts. Customers manage their own addresses, wishlist, and order history in their account area." },
        ],
      },
    ],
  },
  {
    id: "ai",
    label: "AI Tools",
    icon: "Sparkles",
    description: "The next-generation AI features.",
    articles: [
      {
        id: "ai-builder",
        title: "AI Site Builder",
        summary: "Build pages and products by chatting with an agent.",
        href: "/admin/ai-builder",
        blocks: [
          { type: "p", text: "The AI Site Builder plans and executes real database operations from natural language. Ask it to build a homepage, add blocks, create products, or edit existing content." },
          { type: "ul", items: [
            "Creates, updates, and deletes pages and blocks.",
            "Creates and updates products with prices and descriptions.",
            "Validates every block config against the block schema.",
            "Applies changes live and summarizes what it did.",
          ]},
          { type: "tip", text: "Draft pages must be published before visitors can see them. Ask the builder to publish the page when you're happy with it." },
        ],
      },
      {
        id: "ai-auditor",
        title: "AI Site Auditor",
        summary: "Automated health score + one-click fixes.",
        href: "/admin/ai-auditor",
        blocks: [
          { type: "p", text: "Run an audit to get a 0-100 health score for your site covering SEO, content, commerce, and accessibility." },
          { type: "ul", items: [
            "Finds missing meta titles/descriptions, empty pages, missing product images/descriptions, out-of-stock active products, missing blog excerpts, and bad nav links.",
            "AI writes a plain-language summary of the top issues.",
            "One-click fixes generate and save metadata, publish drafts, and write product/blog copy.",
          ]},
        ],
      },
      {
        id: "ai-chatbot",
        title: "AI Storefront Assistant",
        summary: "RAG chatbot that answers from your content.",
        href: "/admin/ai-chatbot",
        blocks: [
          { type: "steps", title: "Set up the assistant", items: [
            "Enable the AI Chatbot feature for the site.",
            "Open Admin → AI Storefront Assistant.",
            "Enable the assistant and click Re-index content.",
            "Ensure AI chat is enabled in Settings → AI (an API key must be configured).",
          ]},
          { type: "p", text: "The assistant embeds your pages, blocks, products, blog, and services, then retrieves the most relevant content for each visitor question. Answers stay grounded in your site rather than generic AI guesses." },
          { type: "tip", text: "Re-index whenever your content changes so answers stay fresh." },
        ],
      },
      {
        id: "ai-forecast",
        title: "AI Demand Forecasting",
        summary: "Predict orders, revenue, and restock needs.",
        href: "/admin/ai-forecast",
        blocks: [
          { type: "p", text: "Generates a 30-day forecast of orders and revenue from the last 90 days of paid orders, using moving averages, day-of-week patterns, and trend." },
          { type: "ul", items: [
            "Per-product restock alerts with suggested reorder quantities.",
            "A visual daily forecast alongside historical data.",
            "An AI-written narrative summarizing trend and risks.",
          ]},
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "Settings & Layout",
    icon: "Settings",
    description: "Site settings, languages, navigation, and theme.",
    articles: [
      {
        id: "site-settings",
        title: "Site settings",
        summary: "Branding, contact, SEO, and integrations.",
        href: "/admin/settings",
        blocks: [
          { type: "ul", items: [
            "General: site name, tagline, description, hero content, homepage toggles.",
            "Theme: colors, typography tokens; or generate a palette with the AI Theme Generator.",
            "Integrations: Cloudinary, SMTP, AI provider (OpenAI/Anthropic/Google/custom).",
            "AI: provider, model, system prompt, and chat toggle.",
            "Commerce: currency, tax, shipping.",
          ]},
        ],
      },
      {
        id: "languages",
        title: "Languages (i18n)",
        summary: "Multi-language pages and blocks.",
        href: "/admin/i18n",
        blocks: [
          { type: "p", text: "Add locales under Admin → Languages. Pages and blocks can have translations; use the AI translation tool to translate a whole page while preserving the block schema." },
        ],
      },
      {
        id: "navigation-layout",
        title: "Navigation & layout",
        summary: "Header, footer, and nav links.",
        href: "/admin/navigation",
        blocks: [
          { type: "ul", items: [
            "Navigation: add, reorder, and hide nav links.",
            "Layout: choose header/footer visibility, stickiness, and which footer columns show.",
            "The theme customizer lets you fine-tune colors beyond the presets.",
          ]},
        ],
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: "Shield",
    description: "Users, billing, webhooks, A/B testing, and monitoring.",
    articles: [
      {
        id: "users",
        title: "Users & permissions",
        summary: "Roles, site assignment, and feature grants.",
        href: "/admin/users",
        blocks: [
          { type: "p", text: "Roles: viewer (read-only), editor (create/edit content), admin (manage users/billing), super_admin (everything, all sites)." },
          { type: "ul", items: [
            "Admins are assigned to one site; super admins manage all sites.",
            "Per-user feature overrides can grant or revoke modules (e.g. Commerce, AI tools) for a user.",
            "Tenant feature access is also configurable per site from the Sites page.",
          ]},
        ],
      },
      {
        id: "billing",
        title: "Billing & plans",
        summary: "Subscription plans and Stripe billing.",
        href: "/admin/billing",
        blocks: [
          { type: "p", text: "Create plans with pricing, limits (pages/products/storage/bandwidth), and features. Tenants subscribe via Stripe Checkout and manage payment through the Stripe portal." },
        ],
      },
      {
        id: "webhooks",
        title: "Webhooks",
        summary: "Send site events to external services.",
        href: "/admin/webhooks",
        blocks: [
          { type: "p", text: "Webhooks deliver real-time events (order.created, booking.created, form.submitted, etc.) as signed POSTs to your endpoint." },
          { type: "ul", items: [
            "Payload is JSON: { event, timestamp, siteId, data }.",
            "Sign with X-Webhook-Signature: sha256=<HMAC> and X-Webhook-Timestamp when a secret is set.",
            "Deliveries are logged with attempts, status codes, and responses; you can retry from the admin.",
            "Non-2xx server errors retry up to 3 times (5s, 30s, 2min).",
          ]},
        ],
      },
      {
        id: "experiments",
        title: "A/B testing",
        summary: "Run experiments across your pages.",
        href: "/admin/experiments",
        blocks: [
          { type: "p", text: "Create experiments with traffic split, run them, and review conversion results. Variants are assigned per visitor." },
        ],
      },
      {
        id: "monitoring",
        title: "Errors, activity & analytics",
        summary: "Self-hosted monitoring.",
        href: "/admin/errors",
        blocks: [
          { type: "ul", items: [
            "Errors: self-hosted error tracking with resolution workflow.",
            "Activity Log: audit trail of admin actions.",
            "Analytics: page views, heatmaps, funnels, and the dashboard.",
            "Export: one-click tenant data export.",
          ]},
        ],
      },
    ],
  },
  {
    id: "developers",
    label: "Developers",
    icon: "Code2",
    description: "API routes, webhooks, environment variables, and RAG setup.",
    articles: [
      {
        id: "api-routes",
        title: "API routes",
        summary: "The public and internal HTTP endpoints.",
        href: "/admin/webhooks",
        blocks: [
          { type: "p", text: "All endpoints are under /api. Public routes are rate-limited and behind CORS/CSRF checks in middleware." },
          { type: "table",
            headers: ["Route", "Method", "Purpose"],
            rows: [
              ["/api/chat", "POST", "Storefront AI chat/RAG assistant"],
              ["/api/ai/models", "GET", "List AI models for the active provider"],
              ["/api/ai/usage", "GET", "AI API usage overview"],
              ["/api/errors/log", "POST", "Client error reporting"],
              ["/api/upload", "POST", "Multipart upload to Cloudinary"],
              ["/api/payments/stripe/checkout", "POST", "Create Stripe Checkout Session (one-time)"],
              ["/api/payments/stripe/subscription-checkout", "POST", "Create Stripe Checkout Session (subscription)"],
              ["/api/payments/stripe/portal", "POST", "Open Stripe billing portal"],
              ["/api/payments/stripe/webhook", "POST", "Stripe webhook handler (signed)"],
              ["/api/payments/esewa/initiate", "POST", "Begin eSewa payment"],
              ["/api/payments/esewa/callback", "GET", "eSewa payment callback"],
              ["/api/payments/esewa/failure", "GET", "eSewa failure redirect"],
            ]},
        ],
      },
      {
        id: "webhook-events",
        title: "Webhook events",
        summary: "All event types your endpoint can receive.",
        href: "/admin/webhooks",
        blocks: [
          { type: "table",
            headers: ["Event", "Fires when"],
            rows: [
              ["order.created", "A new order is placed"],
              ["order.paid", "Order payment confirmed"],
              ["order.fulfilled", "Order fulfilled"],
              ["order.cancelled", "Order cancelled"],
              ["form.submitted", "A form submission was received"],
              ["page.published", "A page is published"],
              ["page.created", "A page is created"],
              ["product.created", "A product is added"],
              ["product.updated", "A product is updated"],
              ["customer.registered", "A customer registers"],
              ["booking.created", "A booking is made"],
              ["message.received", "A contact message is received"],
              ["subscription.created", "A subscription starts"],
              ["subscription.updated", "A subscription changes"],
              ["subscription.cancelled", "A subscription is cancelled"],
              ["subscription.payment_failed", "A subscription payment fails"],
            ]},
          { type: "code", lang: "shell", code: "# Example payload\n{\n  \"event\": \"order.created\",\n  \"timestamp\": \"2026-08-09T12:00:00.000Z\",\n  \"siteId\": 3,\n  \"data\": { \"id\": 42, \"orderNumber\": \"ORD-...\" }\n}\n\n# Verify the signature\nX-Webhook-Signature: sha256=<hex hmac sha256 of raw body using your secret>\nX-Webhook-Timestamp: 1754236800" },
        ],
      },
      {
        id: "env-vars",
        title: "Environment variables",
        summary: "Required and optional configuration.",
        href: "/admin/settings",
        blocks: [
          { type: "code", lang: "shell", code: "# Required\nDATABASE_URL=postgresql://...\nAUTH_SECRET=your-jwt-secret\nADMIN_EMAIL=admin@example.com\nADMIN_PASSWORD=secure-password\nSITE_URL=https://yourdomain.com\n\n# Optional\nSMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= SMTP_FROM=\nCLOUDINARY_CLOUD_NAME= CLOUDINARY_API_KEY= CLOUDINARY_API_SECRET=\nSTRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= STRIPE_PRICE_ID=\nPLATFORM_DOMAIN= DOMAIN_CNAME_TARGET=\nCOMMERCE_SECRETS_KEY=" },
          { type: "p", text: "Tenant-specific secrets (AI keys, SMTP, payment credentials) are stored in the settings table and never exposed to the public client." },
        ],
      },
      {
        id: "rag-setup",
        title: "RAG / embeddings setup",
        summary: "How the storefront assistant retrieves content.",
        href: "/admin/ai-chatbot",
        blocks: [
          { type: "p", text: "Site content is chunked and embedded into the ai_chunks table. At query time the top-K most similar chunks are injected into the chat system prompt." },
          { type: "ul", items: [
            "OpenAI-compatible providers use their /embeddings endpoint (text-embedding-3-small by default).",
            "Anthropic and Google fall back to a deterministic lexical embedding so retrieval still works.",
            "Chunks are capped at 1200 chars with overlap; the index is per-site.",
            "Re-index from Admin → AI Storefront Assistant whenever content changes.",
          ]},
        ],
      },
    ],
  },
];

export function getDocArticle(categoryId: string, articleId: string): DocArticle | null {
  const category = DOC_CATEGORIES.find((c) => c.id === categoryId);
  return category?.articles.find((a) => a.id === articleId) ?? null;
}

export function searchDocs(query: string): Array<{ category: DocCategory; article: DocArticle }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: Array<{ category: DocCategory; article: DocArticle }> = [];
  for (const category of DOC_CATEGORIES) {
    for (const article of category.articles) {
      const haystack = [article.title, article.summary, ...article.blocks.map((b) => "text" in b ? b.text : "items" in b ? b.items.join(" ") : "code" in b ? b.code : "")].join(" ").toLowerCase();
      if (haystack.includes(q)) results.push({ category, article });
    }
  }
  return results.slice(0, 12);
}

/** Public help/FAQ content shown on /help and /faq. */
export const DEFAULT_FAQ = [
  { question: "How can I place an order?", answer: "Browse products, add items to your cart, and check out. You'll confirm your order and payment in one flow." },
  { question: "How do I make a booking or reservation?", answer: "Use the booking form on the site, or contact us directly. You'll receive confirmation by email or phone." },
  { question: "What payment methods do you accept?", answer: "Accepted methods depend on the store configuration — typically cards (Stripe) and local wallets like eSewa." },
  { question: "How do I contact support?", answer: "Use the contact form on the site, email us, or call during business hours. Your message reaches us immediately." },
  { question: "What are your hours?", answer: "Hours are listed in the footer and on the contact page of this site." },
] as const;
