# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js Version Warning

This project uses **Next.js 16** with **React 19**. APIs and conventions differ significantly from earlier versions. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. Pay attention to deprecation notices.

Notable hint from the docs: for slow client-side navigations, `Suspense` alone is not enough — you must also export `unstable_instant` from the route. Read `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.mdx` before touching navigation performance.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # prisma generate + next build
npm run lint         # ESLint
npm run seed         # Seed database (ts-node with CommonJS)
npm run db:push      # Push Prisma schema to DB (no migrations)
npm run db:studio    # Open Prisma Studio
```

No test framework is configured.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for JWT signing
- `NEXT_PUBLIC_APP_URL` — App base URL
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` — Web Push / VAPID keys

## Architecture

### App Router (App Directory)

All pages and API routes live in `src/app/`. The project uses the App Router exclusively — no Pages Router.

**Route groups:**
- Protected pages: `/home`, `/calendar`, `/services`, `/stats`, `/profile`, `/onboarding`, `/booking`, `/notifications`, `/team`, `/settings`, `/staff`
- Auth-only pages (redirect to `/home` when logged in): `/login`, `/register`
- Public booking pages: `/p/[slug]/` — always accessible, no auth required

**API routes** are in `src/app/api/` and cover: `auth/`, `appointments/`, `clients/`, `services/`, `notifications/`, `settings/`, `stats/`, `team/invite/`, `public/[slug]/`

### Authentication

- JWT stored in `musa_session` HTTP-only cookie (30-day expiry)
- `src/lib/auth.ts` — JWT sign/verify with `jose` (Edge Runtime compatible), session cookie options
- `middleware.ts` — Edge middleware that enforces auth on private routes; never import Prisma or bcryptjs here (not Edge-compatible)
- In API routes/Server Components: call `getSession()` with no args (uses `next/headers`)
- In middleware: call `getSession(req)` passing the `NextRequest`

### Database

PostgreSQL accessed via Prisma ORM. Key models and relationships:

```
Business → Plan (subscription tier)
Business → User[] (OWNER | STAFF roles)
Business → Client[]
Business → Service[]
Business → Appointment[]
User → ProfessionalSettings (work days/hours as JSON string)
User → PushSubscription[]
User → Notification[]
Appointment → Payment
Business → Invitation[]
```

`src/lib/prisma.ts` exports the singleton Prisma client. `workDays` in `ProfessionalSettings` is stored as a JSON string — parse it on read.

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).

### State Management

- Zustand store at `src/store/useAppStore.ts` for global app state
- Per-feature hooks in `src/hooks/` (e.g., `useAppointments`, `useClients`, `useServices`) that wrap API calls

### Styling

Tailwind CSS 4 (PostCSS plugin). No CSS modules or CSS-in-JS.

### PWA / Push Notifications

- `public/manifest.json` — PWA manifest
- `public/sw.js` — Service worker for push notifications
- `src/lib/notifications.ts` — Notification utilities
- VAPID keys required for push subscription (`/api/notifications/subscribe`)

### Public Discovery Layer (client-facing)

- `/` — dual-audience homepage: shows global active promotions, search bar → `/explore`, dual CTA (clientas / profesionales)
- `/explore` — business discovery; search by `q`, `city`, `category`; backed by `GET /api/public/businesses`; clicking a card → `/p/[ownerSlug]`
- `/client` — client portal (unauthenticated: shows login/register CTAs; authenticated: upcoming + past appointments)
- `/client/login` — phone + name verification → JWT stored in `localStorage` as `musa_client_token`
- `/client/register` — profile preferences form, saved to `localStorage`; no DB write until first booking

**Client auth** (`src/lib/clientAuth.ts`):
- `POST /api/client/verify` — phone + name match against existing `Client` records → returns signed JWT (`purpose: "client"`)
- `GET /api/client/bookings` — reads `Authorization: Bearer <token>`, queries all appointments by `client.phone`
- Token secret is `JWT_SECRET + "_client"`; stored in `localStorage`, not in a cookie

**BottomNavBar and TopAppBar** hide themselves on `/explore`, `/client/*`, `/forgot-password`, `/reset-password`, and all existing public paths.

### Plan Limits

`src/lib/limits.ts` enforces per-plan feature limits. Check this when adding features gated by subscription tier.

### Push Notifications (bidirectional)

- `src/lib/notifications.ts` — `sendNotification(userId)` for staff, `sendClientNotification(clientId)` for clients, `broadcastToBusinessClients(businessId)` for promo blasts
- `src/hooks/usePushSubscription.ts` — shared hook; pass `endpoint: '/api/notifications/subscribe'` for staff (auth required) or `endpoint: '/api/push/subscribe-client'` + `clientId` for public clients
- Staff subscribe: `POST /api/notifications/subscribe` (requires session)
- Client subscribe: `POST /api/push/subscribe-client` (no auth, needs `clientId` from book API)
- `public/sw.js` handles `push` events and `notificationclick` with action buttons (`confirm`/`cancel` → hits `/api/appointments/[id]/action`)

### Client Registration

The book API (`POST /api/public/[slug]/book`) accepts `wantsNotifications: boolean` and now returns `clientId`. The `clientId` is persisted in `localStorage` (keyed by slug) for return-visit detection and for calling `subscribe-client`. `Client.businessId` is now set on upsert to enable promo broadcasts.

### Forgot / Reset Password

- `POST /api/auth/forgot-password` — finds user by email, creates `PasswordResetToken` (1h expiry), sends email via Resend
- `POST /api/auth/reset-password` — validates token, hashes new password, marks token used
- Requires `RESEND_API_KEY` env var. The `Resend` client is instantiated inside the handler (not at module level) to avoid build-time errors.

### Promotions

- Model: `Promotion` (businessId, title, description, discount %, validFrom, validUntil, isActive)
- CRUD: `GET|POST /api/promotions`, `PATCH|DELETE /api/promotions/[id]` — OWNER only
- Broadcast push: `POST /api/promotions/broadcast` — sends to all `Client` with `wantsNotifications=true` and a push subscription
- Public: `GET /api/public/[slug]/promotions` — returns active promos for the booking page (no auth)
- UI: `src/components/PromotionBanner.tsx` — banner + detail modal on booking page
- Dashboard: `/promotions` — protected route (OWNER), CRUD + broadcast button
