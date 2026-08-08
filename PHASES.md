# Admino Development Phases

## Project Overview

**Admino** is a multi-tenant SaaS CMS/e-commerce platform built with Next.js 16, React 19, Drizzle ORM, and PostgreSQL.

### Tech Stack
- **Framework**: Next.js 16.2.12 (App Router)
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT (jose) + bcryptjs
- **AI**: OpenAI, Anthropic, Google Gemini
- **UI**: Tailwind CSS 4, shadcn/ui, Radix UI
- **Payments**: Stripe (subscriptions), Khalti, eSewa, QR
- **Storage**: Cloudinary
- **Email**: Nodemailer (SMTP)

### Database Schema
- **43 tables** covering: multi-tenancy, CMS, e-commerce, blog, bookings, services, messaging, billing/subscriptions, i18n, A/B testing, analytics, webhooks, rate limiting

### Codebase Size
- **35+ server actions** in `lib/actions/`
- **28 admin pages** in `app/admin/`
- **12 storefront routes** in `app/(site)/`
- **18+ components** in `components/admin/`

---

## Completed Phases

### Phase 1-4: Core Platform Development
- Multi-tenant architecture
- CMS with drag-and-drop builder
- E-commerce (products, carts, orders)
- Blog system
- Bookings & services
- Authentication & authorization
- Media management

### Phase 5: Advanced Features (commit `bd694f7`)
- Advanced analytics dashboard
- A/B testing experiments
- i18n multi-language support
- Database schema updates

### Phase 6: Commerce & Customer Management (commit `2e8a374`)
- A/B storefront integration
- Conversion funnels
- Admin customer management
- Stripe webhook handler

### Phase 7: Security & UX Polish (commit `7b6bbff`)
- Middleware implementation
- Storefront providers
- Analytics tracking hook
- Locale switcher
- AI SEO/product buttons
- Heatmap integration

### Phase 8: UX Improvements & AI Fixes (commit `8b4e2f1`)
**UI Enhancements:**
- Admin sidebar: mobile Sheet, collapsible nav groups, active state indicators
- Loading states: skeleton UI replacing spinners
- Error pages: improved 404 and error boundaries
- Confirmation dialogs: AlertDialog replacing `window.confirm`
- Account sidebar: client component with active state

**AI Provider Fixes:**
- Created shared `lib/ai-provider.ts` utility
- Fixed product-ai, blog-ai, translation-ai (were OpenAI-only)
- Fixed seo-ai, block-ai, theme-ai, layout-ai
- Error messages now show actual API URL
- Fixed Google `systemInstruction` bug in layout-ai

### Phase 11: UX Polish (commit pending)
- Skeleton loading states (cart, checkout, admin homepage, navigation)
- Block editor: undo/redo, duplication, keyboard shortcuts
- Theme AI rationale max length fix (240 → 1000)
- bazaarlink.ai jsonMode fix (removed unsupported `response_format`)

### Phase 12: Self-Hosted Error Tracking (commit pending)
- Created `error_logs` table with indexes
- Created `lib/error-tracking.ts` utility (log, query, resolve, stats)
- Created `lib/actions/error-ai.ts` server actions
- Created `app/api/errors/log/route.ts` API endpoint
- Created `app/admin/(panel)/errors/page.tsx` admin error viewer
- Updated error boundaries to auto-log errors to database
- Self-hosted PostgreSQL-based tracking (no Sentry dependency)

### Phase 13: Block Editor UX (commit pending)
- Client-side undo/redo with history stack
- Block duplication (Ctrl+D, toolbar button, copy button)
- Keyboard shortcuts help panel in sidebar
- All block operations push to history

### Phase 14: Performance Optimization (commit pending)
**Lazy Loading:**
- `next/dynamic` for recharts (analytics-charts.tsx)
- `next/dynamic` for TipTap editor (rich-text-editor.tsx)
- `next/dynamic` for @dnd-kit (homepage, page editor)

**Suspense Boundaries:**
- Admin dashboard: streaming stats, charts, recent bookings independently
- Server component pages: bookings, messages, gallery, blog, menu, etc.

**Bug Fixes:**
- Super admin "No site assigned" fix: replaced `user.siteId` with `getCurrentAdminSiteId()` across 16 functions in 5 files
- Quick add locale: fixed portal querySelector bug (Dialog renders in portal)

### Phase 8: UX Improvements & AI Fixes (commit `8b4e2f1`)
**UI Enhancements:**
- Admin sidebar: mobile Sheet, collapsible nav groups, active state indicators
- Loading states: skeleton UI replacing spinners
- Error pages: improved 404 and error boundaries
- Confirmation dialogs: AlertDialog replacing `window.confirm`
- Account sidebar: client component with active state

**AI Provider Fixes:**
- Created shared `lib/ai-provider.ts` utility
- Fixed product-ai, blog-ai, translation-ai (were OpenAI-only)
- Fixed seo-ai, block-ai, theme-ai, layout-ai
- Error messages now show actual API URL
- Fixed Google `systemInstruction` bug in layout-ai

**TypeScript Fixes:**
- Fixed `getPages()` missing argument → `getPagesForCurrentSite()`
- Fixed `siteId` narrowing in use-analytics-tracking
- Fixed `avgDuration?.avg` array access in analytics

**New Components:**
- `components/admin/rich-text-editor.tsx` — TipTap WYSIWYG editor
- `components/admin/blog-manager.tsx` — Rewritten with AI writer
- `components/admin/booking-delete-button.tsx` — Client component
- `components/admin/message-delete-button.tsx` — Client component
- `components/account/account-sidebar.tsx` — Client component
- `components/account/account-sidebar-actions.ts` — Server actions

---

## Future Phases

### Phase 9: Production Security & Deployment
**Priority: HIGH** — Blocks production launch

#### Tasks
1. **Middleware Implementation**
   - Create `middleware.ts` with CSP headers
   - Add CSRF protection
   - Implement edge-level rate limiting
   - Add automatic auth redirects

2. **Next.js Security Hardening**
   - Add security headers to `next.config.ts`
   - Set `output: "standalone"` for Docker
   - Remove `poweredBy` header
   - Enable compression

3. **Deployment Configuration**
   - Create Dockerfile with multi-stage build
   - Create docker-compose.yml
   - Add Vercel deployment config
   - Add Railway/Render deployment options

4. **Environment Variables**
   - Update `.env.example` with all required vars
   - Add `STRIPE_WEBHOOK_SECRET`
   - Document AI API key configuration

5. **CI/CD Pipeline**
   - GitHub Actions for lint/build/test
   - Automated deployment on main branch

**Estimated Effort**: 2-3 days

---

### Phase 10: Payment Integration
**Priority: HIGH** — Required for e-commerce revenue

#### Tasks
1. **Stripe SDK Integration**
   - Add `stripe` npm package
   - Create Stripe client utility
   - Configure webhook endpoint

2. **Checkout Flow**
   - Create Stripe Checkout Sessions for orders
   - Add PaymentIntent flow for one-time payments
   - Handle payment success/failure redirects

3. **Payment Configuration UI**
   - Enhance settings form with payment provider selection
   - Add Stripe API key configuration
   - Add test/live mode toggle

4. **Subscription Billing**
   - Complete Stripe Billing integration
   - Add plan upgrade/downgrade flows
   - Implement usage-based billing

5. **Multi-Currency Support**
   - Add currency selection per tenant
   - Support USD, EUR, NPR, INR
   - Handle currency conversion

**Estimated Effort**: 3-4 days

---

### Phase 11: Performance & UX Polish
**Priority: MEDIUM** — Improves user experience

#### Tasks
1. **Skeleton Loading States**
   - Product list skeletons
   - Order list skeletons
   - Blog post list skeletons
   - Dashboard widget skeletons

2. **Streaming & Suspense**
   - Add Suspense boundaries for data-heavy components
   - Implement streaming for admin dashboard
   - Add progressive loading for storefront

3. **Image Optimization**
   - Remove `unoptimized` props where possible
   - Add blur placeholders
   - Implement lazy loading for below-fold images

4. **Admin Component Optimization**
   - Lazy load heavy admin components
   - Implement virtual scrolling for large lists
   - Add keyboard shortcuts for power users

5. **Mobile Experience**
   - Optimize touch interactions
   - Add swipe gestures for navigation
   - Improve form UX on mobile

**Estimated Effort**: 2-3 days

---

### Phase 12: Analytics & Monitoring
**Priority: MEDIUM** — Business intelligence and reliability

#### Tasks
1. **Third-Party Analytics**
   - Integrate Google Analytics 4
   - Add Plausible Analytics option
   - Implement UTM parameter tracking

2. **Real-Time Dashboard**
   - WebSocket for live visitor counts
   - Real-time order notifications
   - Live heatmap updates

3. **Error Tracking**
   - Integrate Sentry for error monitoring
   - Add performance monitoring
   - Create error alerting

4. **Performance Monitoring**
   - Add Core Web Vitals tracking
   - Monitor API response times
   - Track database query performance

5. **Automated Backups**
   - Schedule daily database backups
   - Add backup restore functionality
   - Implement backup verification

**Estimated Effort**: 3-4 days

---

### Phase 13: Launch Preparation
**Priority: HIGH** — Pre-launch checklist

#### Tasks
1. **Security Audit**
   - Penetration testing
   - SQL injection testing
   - XSS vulnerability assessment
   - Authentication bypass testing

2. **Load Testing**
   - Simulate 1000+ concurrent users
   - Test database performance under load
   - Identify bottlenecks

3. **Documentation**
   - API reference documentation
   - Admin user guide
   - Developer setup guide
   - Deployment guide

4. **Onboarding Flow**
   - Create guided setup wizard
   - Add interactive tutorials
   - Implement progress tracking

5. **Marketing Assets**
   - Landing page design
   - Feature showcase
   - Pricing page
   - Demo environment

**Estimated Effort**: 5-7 days

---

## Current Status Assessment

### Feature Completeness: 85%
- ✅ Multi-tenant CMS
- ✅ E-commerce (products, carts, orders)
- ✅ Blog with AI writer
- ✅ Bookings & services
- ✅ AI tools (SEO, content, themes)
- ✅ i18n multi-language
- ✅ A/B testing
- ✅ Webhooks
- ⚠️ Payment integration (partial)
- ❌ Custom domain SSL
- ❌ Automated billing

### Security: 85%
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Server action authorization
- ✅ Tenant isolation
- ✅ Secret exclusion from client
- ✅ XSS prevention (DOMPurify)
- ⚠️ No middleware (CSP/CSRF)
- ⚠️ No rate limiting at edge

### Deployment: 40%
- ✅ TypeScript strict mode
- ✅ ESLint configured
- ✅ Build scripts
- ❌ No Dockerfile
- ❌ No deployment config
- ❌ No CI/CD pipeline
- ❌ Missing env vars

### Performance: 70%
- ✅ React cache() deduplication
- ✅ Server-only data fetching
- ✅ Database indexing
- ⚠️ Basic loading states
- ⚠️ No Suspense boundaries
- ❌ No lazy loading

---

## Recommendations

### Immediate (Next 1-2 Weeks)
1. **Phase 9: Security & Deployment** — Blocks everything else
2. **Phase 10: Payment Integration** — Required for revenue

### Short-Term (2-4 Weeks)
3. **Phase 11: Performance & UX** — Improves retention
4. **Phase 12: Analytics & Monitoring** — Business intelligence

### Medium-Term (1-2 Months)
5. **Phase 13: Launch Preparation** — Pre-launch checklist
6. **Phase 14: Marketing & Growth** — User acquisition

---

## Commit History

| Commit | Phase | Description |
|--------|-------|-------------|
| `bd694f7` | Phase 5 | Advanced analytics, A/B testing, i18n |
| `2e8a374` | Phase 6 | Commerce, customers, Stripe webhooks |
| `7b6bbff` | Phase 7 | Middleware, providers, analytics tracking |
| `8b4e2f1` | Phase 8 | UX improvements, AI fixes, TipTap editor |

---

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
SITE_URL=https://yourdomain.com
```

### Optional (Email)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
ADMIN_NOTIFY_EMAIL=admin@yourdomain.com
```

### Optional (Storage)
```bash
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

### Optional (Payments)
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Database Commands

```bash
# Generate migration
bun run db:generate

# Run migration
bun run db:migrate

# Push schema changes
bun run db:push

# Seed database
bun run db:seed

# Provision templates
bun run db:provision-homepages
bun run db:provision-ecommerce-templates
```

---

## Development Commands

```bash
# Start dev server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Run linter
bun run lint

# Run tests
bun run test
```

---

## Architecture Notes

### Multi-Tenancy
- All queries scoped by `siteId`
- Tenant isolation enforced in server actions
- Feature flags per tenant (`lib/tenant-features-constants.ts`)
- Plan-based access control

### Authentication Flow
1. Admin logs in → JWT cookie `maiti_admin_session`
2. Server component calls `requireAdmin()` → validates JWT
3. Server action calls `requireAdmin()` → validates + checks tenant
4. `requireSiteAccess(siteId)` → verifies user belongs to site

### AI Provider Architecture
- Shared `lib/ai-provider.ts` utility
- Supports: OpenAI, Anthropic, Google, Custom
- All AI actions use `callAiProvider()` helper
- Error messages include API URL for debugging

### Data Flow
```
Client → Server Action → requireAdmin() → Business Logic → Database
                ↓
        Activity Log (audit trail)
                ↓
        Webhook Dispatch (event-driven)
```

---

## Testing Strategy

### Current State
- 35 passing test suites
- Unit tests for utilities
- Integration tests for server actions

### Recommended Additions
- E2E tests with Playwright
- API integration tests
- Load testing with k6
- Security testing with OWASP ZAP

---

## Monitoring Checklist

### Pre-Launch
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Database query logging
- [ ] API response time tracking

### Post-Launch
- [ ] Daily error reports
- [ ] Weekly performance reviews
- [ ] Monthly security audits
- [ ] Quarterly dependency updates

---

## Support & Maintenance

### Dependencies to Monitor
- Next.js (major versions)
- React (major versions)
- Drizzle ORM (breaking changes)
- Tailwind CSS (major versions)

### Backup Strategy
- Daily automated database backups
- Weekly manual backup verification
- Monthly restore testing

### Update Schedule
- Security patches: Immediate
- Minor updates: Weekly
- Major updates: Quarterly (after testing)

---

## Contact & Resources

- **Repository**: [GitHub Link]
- **Documentation**: [Docs Link]
- **Support**: [Support Email]
- **Status Page**: [Status URL]

---

*Last Updated: August 2026*
*Version: 1.0.0*
*Status: Private Alpha*
