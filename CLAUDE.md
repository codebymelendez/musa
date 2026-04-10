# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Musa — Desarrollado por [codebymelendez.com](https://codebymelendez.com)

## Next.js Version Warning

This project uses **Next.js 16** with **React 19**. APIs and conventions differ significantly from earlier versions. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. Pay attention to deprecation notices.

Notable hint from the docs: for slow client-side navigations, `Suspense` alone is not enough — you must also export `unstable_instant` from the route. Read `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.mdx` before touching navigation performance.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # next build
npm run lint         # ESLint
```

No test framework is configured.

## Environment Variables

Required in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, bypasses RLS)
- `JWT_SECRET` — Secret for signing client-side booking JWTs (staff auth is handled by Supabase)
- `NEXT_PUBLIC_APP_URL` — App base URL
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` — Web Push / VAPID keys
- `RESEND_API_KEY` — Transactional email via Resend (password reset)

## Architecture

### App Router (App Directory)

All pages and API routes live in `src/app/`. The project uses the App Router exclusively — no Pages Router.

**Route groups:**
- Protected pages: `/home`, `/calendar`, `/services`, `/stats`, `/profile`, `/onboarding`, `/booking`, `/notifications`, `/team`, `/settings`, `/promotions`, `/appointments`, `/clients`
- Auth-only pages (redirect to `/home` when logged in): `/login`, `/register`
- Public booking pages: `/p/[slug]/` — always accessible, no auth required
- Client self-service: `/cita/[token]` — reschedule/cancel via token, no auth required
- Public discovery: `/`, `/explore`
- Client portal: `/client`, `/client/login`, `/client/register`

**API routes** are in `src/app/api/` and cover: `auth/`, `appointments/`, `clients/`, `services/`, `notifications/`, `push/`, `settings/`, `stats/`, `team/invite/`, `public/[slug]/`, `client/`, `promotions/`, `storage/`

### Authentication

**Staff (business users):** Supabase Auth — sessions managed via `@supabase/ssr` cookies. Never use `getSession()` from Supabase client-side (insecure); always use `supabase.auth.getUser()` server-side.

- `src/lib/supabase-server.ts` — creates a server-side Supabase client that reads/writes cookies
- `src/lib/supabase-admin.ts` — `createAdminClient()` uses service role key, bypasses RLS; **server-only, never import in client components**
- `src/lib/auth.ts` — `getSession(req?)` wraps `supabase.auth.getUser()` and returns `{ userId, phone, email }` or `null`; pass `req` in middleware, omit in API routes/Server Components
- `middleware.ts` — Edge middleware enforcing auth on private routes; never import `supabase-admin` or `bcryptjs` here (not Edge-compatible)
- After email confirmation, Supabase redirects to `/auth/callback`, which exchanges the code for a session and redirects to `/home` or `/onboarding`

**Client portal (end-customers):** Passwordless via phone + name verification.

- `src/lib/clientAuth.ts` — signs/verifies JWTs with `jose` (secret: `JWT_SECRET + "_client"`), stored in `localStorage` as `musa_client_token`
- `POST /api/client/verify` — phone + name lookup against `Client` table → JWT
- `GET /api/client/bookings` — reads `Authorization: Bearer <token>`

### Database

PostgreSQL via **Supabase** (direct table queries using the JS client). No ORM. Key tables and relationships:

```
Business → Plan (subscription tier, limits stored as JSON in Plan.limits)
Business → User[] (OWNER | STAFF roles)
Business → Client[]
Business → Service[]
Business → Appointment[]
Business → Invitation[]
Business → Promotion[]
User → ProfessionalSettings (workDays/hours stored as JSON string — parse on read)
User → PushSubscription[]
User → Notification[]
Appointment → Payment
Client → PushSubscription[] (client-side push, keyed by clientId)
```

`Business.currentMonthBookings` is incremented on each booking and checked against `Plan.limits.maxMonthlyAppointments`.

**Admin client vs. regular client:**
- Use `createAdminClient()` from `src/lib/supabase-admin.ts` when you need to bypass RLS (e.g., cross-user reads in API routes).
- Use `createClient()` from `src/lib/supabase-server.ts` when the query should respect the authenticated user's RLS policies.

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).

### State Management

- Zustand store at `src/store/useAppStore.ts` for global app state
- Per-feature hooks in `src/hooks/` (e.g., `useAppointments`, `useClients`, `useServices`) that wrap API calls

### Styling

Tailwind CSS 4 (PostCSS plugin). No CSS modules or CSS-in-JS.

### PWA / Push Notifications

- `public/manifest.json` — PWA manifest
- `public/sw.js` — Service worker; handles `push` events and `notificationclick` with `confirm`/`cancel` actions that call `/api/appointments/[id]/action`
- `src/lib/notifications.ts` — `sendNotification(userId)` for staff, `sendClientNotification(clientId)` for clients, `broadcastToBusinessClients(businessId)` for promo blasts
- `src/hooks/usePushSubscription.ts` — shared hook; pass `endpoint: '/api/notifications/subscribe'` for staff (requires session) or `endpoint: '/api/push/subscribe-client'` + `clientId` for public clients
- VAPID keys required

### Public Discovery Layer (client-facing)

- `/` — dual-audience homepage: shows global active promotions, search bar → `/explore`, dual CTA (clientas / profesionales)
- `/explore` — business discovery backed by `GET /api/public/businesses`; clicking a card → `/p/[ownerSlug]`
- `/client` — client portal (unauthenticated: CTAs; authenticated: upcoming + past appointments)

**BottomNavBar and TopAppBar** hide themselves on `/explore`, `/client/*`, `/forgot-password`, `/reset-password`, and all existing public paths.

### Client Booking Flow

`POST /api/public/[slug]/book` accepts `wantsNotifications: boolean` and returns `clientId`. The `clientId` is persisted in `localStorage` (keyed by slug) for return-visit detection and for calling `POST /api/push/subscribe-client`. On upsert, `Client.businessId` is set to enable promo broadcasts.

### Plan Limits

`src/lib/limits.ts` — `checkAppointmentLimit(businessId)` and `incrementAppointmentCount(businessId)`. Check this when adding features gated by subscription tier.

### Forgot / Reset Password

- `POST /api/auth/forgot-password` — creates `PasswordResetToken` (1h expiry), sends email via Resend
- `POST /api/auth/reset-password` — validates token, hashes with bcryptjs, marks token used
- `Resend` client is instantiated inside the handler (not at module level) to avoid build-time errors

### Promotions

- Model: `Promotion` (businessId, title, description, discount %, validFrom, validUntil, isActive)
- CRUD: `GET|POST /api/promotions`, `PATCH|DELETE /api/promotions/[id]` — OWNER only
- Broadcast push: `POST /api/promotions/broadcast` — sends to all clients with `wantsNotifications=true`
- Public: `GET /api/public/[slug]/promotions` — active promos for booking page (no auth)
- Dashboard: `/promotions` — protected route (OWNER), CRUD + broadcast button
