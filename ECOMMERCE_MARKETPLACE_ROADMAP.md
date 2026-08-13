# Ecommerce Marketplace Roadmap

## Product Direction

Build Admino commerce into a professional B2C and B2B platform inspired by the capabilities of Daraz and Alibaba, while keeping tenant isolation and server-authoritative pricing. This is a phased marketplace program, not only a storefront redesign.

## Phase 1: Commerce Foundation

- Real-time cart quantity in desktop and mobile navigation.
- Product quantity selector and server-authoritative wholesale price tiers.
- Wholesale savings displayed on product and cart pages.
- Recalculate wholesale prices in cart, manual checkout, and Stripe checkout.
- Add automated tests for tier boundaries, inventory limits, and cart synchronization.
- Add stock reservations and transactional inventory checks before broader launch.

## Phase 2: Promotions And Totals

- Tenant-scoped promotion and coupon models.
- Percentage, fixed amount, free shipping, product/category, and minimum-spend rules.
- Start/end times, usage caps, per-customer limits, first-order eligibility, and combinability.
- Coupon administration with draft, scheduled, active, and expired states.
- Server-side subtotal, discount, shipping, tax, and final-total calculation shared by every payment provider.
- Coupon input, applied promotion details, removal, errors, savings, and free-shipping progress in cart and checkout.
- Immutable promotion snapshots on orders and redemption audit records.

## Phase 3: Customer Growth

- Real newsletter subscriptions with consent evidence, double opt-in, unsubscribe, and suppression handling.
- Segments for new-product alerts, back-in-stock alerts, price drops, abandoned carts, and order lifecycle messages.
- Durable email queue with retries, idempotency, delivery status, bounce handling, and provider webhooks.
- Campaign builder with audience preview, scheduling, templates, test sends, and conversion attribution.
- Customer accounts, addresses, order history, wishlist, recently viewed products, reviews, and loyalty.

## Phase 4: Marketplace Operations

- Seller onboarding, verification, roles, stores, commissions, contracts, and payout accounts.
- Seller-scoped catalogs, inventory, order lines, fulfillment SLAs, returns, disputes, and settlements.
- Product variants, SKUs, attributes, category taxonomy, bulk import/export, media galleries, and moderation.
- RFQ and negotiated quotes for B2B buyers, minimum order quantities, samples, and buyer-specific price lists.
- Split orders, multi-seller shipping, commissions, payout ledgers, refunds, and reconciliation.

## Phase 5: Discovery And Scale

- Search indexing, autocomplete, typo tolerance, facets, ranking, and merchandising rules.
- Dynamic category navigation, mega menu, recommendations, comparison, flash sales, and sponsored placements.
- Multi-currency, localization, regional tax/shipping, fraud controls, analytics, seller scorecards, and observability.
- Performance budgets, accessibility audits, SEO product feeds, structured data, and load testing.

## Launch Gates

- No client-authoritative prices or discounts.
- Tenant isolation tests for every commerce model and action.
- Atomic inventory and idempotent payment/webhook handling.
- Promotion calculations shared across cart, checkout, orders, refunds, and payment providers.
- Consent-compliant email delivery with unsubscribe and suppression support.
- Marketplace payments and seller payouts reviewed for local legal, tax, and KYC requirements.
