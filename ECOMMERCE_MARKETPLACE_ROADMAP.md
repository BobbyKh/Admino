# Ecommerce Marketplace Roadmap

## Product Direction

Build Admino commerce into a professional B2C and B2B platform inspired by the capabilities of Daraz and Alibaba, while keeping tenant isolation and server-authoritative pricing. This is a phased marketplace program, not only a storefront redesign.

## Phase 1: Commerce Foundation

Status: Complete.

- [x] Real-time cart quantity in desktop and mobile navigation.
- [x] Product quantity selector and server-authoritative wholesale price tiers.
- [x] Wholesale savings displayed on product, featured product, and cart views.
- [x] Recalculate wholesale prices in cart, manual checkout, and Stripe checkout.
- [x] Add automated tests for tier boundaries and inventory lifecycle safeguards.
- [x] Add atomic stock reservations that prevent negative inventory under concurrent checkout.
- [x] Commit reservations on confirmed payments and cash-on-delivery orders.
- [x] Release reservations exactly once after rejection, provider failure, session expiry, or timeout.
- [x] Clean up expired reservations through the authenticated cleanup cron.

## Phase 2: Promotions And Totals

Status: Complete for single-code promotions. Promotion stacking/combinability remains intentionally disabled.

- [x] Tenant-scoped promotion, coupon, and redemption models.
- [x] Percentage, fixed amount, free shipping, product/category, and minimum-spend rules.
- [x] Start/end times, usage caps, per-customer limits, and first-order eligibility.
- [x] Coupon administration with draft, active, archived, scheduled, and expired behavior.
- [x] Server-side subtotal, discount, shipping, tax, and final-total calculation shared by manual, Stripe, and eSewa checkout.
- [x] Coupon input, applied promotion details, removal, errors, and savings in cart and checkout.
- [x] Immutable promotion snapshots on orders and serialized redemption audit records.
- [x] Currency consistency validation across cart products and payment requests.

## Phase 3: Customer Growth

Status: Customer growth platform complete except for provider-specific bounce and complaint webhooks.

- [x] Real newsletter subscriptions with consent evidence, double opt-in, confirmation expiry, unsubscribe, and suppression states.
- [x] Segments for new-product alerts, wishlist-based back-in-stock alerts, price drops, and consent-safe abandoned carts.
- [x] Existing transactional order lifecycle messages remain active.
- [x] Durable PostgreSQL email queue with idempotency, locking, retries, delivery status, and dead-letter state.
- [x] Campaign administration with scheduling, test sends, new-product templates, audience snapshots, queue health, and UTM attribution.
- [x] Customer accounts, addresses, order history, and wishlist.
- [ ] Add provider-specific bounce/complaint webhooks that move subscribers to suppressed status.
- [x] Add tenant-scoped recently viewed products, verified-purchase reviews, and fulfillment-based loyalty rewards.

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
