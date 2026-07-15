# CineBook Web

Role-aware web client for the CineBook platform — **Customer** storefront + AI chat, **Hall Manager** scheduling console, and **Admin** dashboard, all in one Next.js app talking to the separate backend API (`../backend`).

## Stack

- **Next.js 16.2** (App Router, RSC, Turbopack) + TypeScript (strict)
- **Tailwind CSS v4** — token-driven theme, single source of truth (see below)
- **SWR** (client data) · native `fetch` (server) · **WebSocket** (live seats) · **SSE** (chat)
- **Framer Motion** · **lucide-react** · **Recharts**
- **Bun** as package manager (matches the backend)

## Getting started

The app is now wired to the live backend (`../backend`). Start that first:

```bash
# in ../backend
docker compose up -d          # Postgres + Redis
bun run prisma:migrate && bun run db:seed
bun run dev                   # API on :4000
```

Then the web app:

```bash
bun install
cp .env.example .env.local    # already present; API_BASE_URL → http://localhost:4000
bun run dev                   # http://localhost:3000
```

Log in with a seeded demo phone — the backend echoes the OTP in dev, and the
verify screen pre-fills it:

| Role | Phone |
|---|---|
| Customer | `+919000000003` |
| Hall Manager | `+919000000002` |
| Admin | `+919000000001` |

**Offline preview:** set `NEXT_PUBLIC_DEV_FAKE_AUTH=1` in `.env.local` to tour
all three shells with a mock user and no backend (the verify screen shows a role
picker). Keep it `0` to use the real OTP flow.

## How data flows

- **Reads (RSC):** Server Components call `lib/api/catalog.ts` → `serverFetch`
  → backend `/api/*` directly, attaching the session bearer from the httpOnly
  cookie and unwrapping the `{ data }` envelope.
- **Browser calls:** the client (`lib/api/client.ts`) hits the same-origin BFF
  proxy `app/api/bff/[...path]` → forwards to the backend with the bearer. The
  token never touches JS and there's no CORS to configure.
- **Auth:** `app/api/session` exchanges an OTP for the backend token via
  `/api/auth/otp/verify` and stores it as an httpOnly cookie; `proxy.ts` gates
  routes; role-group layouts resolve the user via `/api/auth/me`.
- **Errors:** the backend's `{ error: { code, message, details } }` becomes a
  typed `ApiError` (with `code`, `status`, `retryAfter`) the UI branches on.

## Theming — one place to re-skin

All colors and fonts live in **one place** so the whole product retunes from a
single edit:

- **`app/globals.css`** — the `@theme` block (colors, fonts, radii, type scale,
  shadows, motion) plus `html.dark` / `html.light` palette overrides. This is
  the source of truth.
- **`lib/design/tokens.ts`** — a JS mirror of the same values, used only where
  CSS variables can't reach (Recharts, the canvas seat map).
- **`app/layout.tsx`** — the three `next/font` families that form the type
  hierarchy: **display** (`--font-display`, Fraunces — an editorial serif for
  headline moments), **sans** (`--font-sans`, Inter — the interface workhorse),
  and **mono** (`--font-mono`, JetBrains Mono — tabular data). Swap any family
  here; the serif↔sans contrast is what carries the visual hierarchy.

Components use only semantic Tailwind utilities generated from these tokens
(`bg-page`, `text-ink-2`, `border-line-2`, `bg-seat-recliner`) — never raw hex
or font names. Current palette: **monochrome premium** — neutral near-black
depths with a refined silver-gray accent (no color-brand accent). Seat categories
stay color-coded (assignment requirement) but muted. Dark is default; a clean
neutral-gray light theme ships alongside. Retuning the whole app is a single edit
to these token values — proven by this exact palette swap.

## Structure

```
app/
  (auth)/        login + OTP verify
  (customer)/    storefront: movies, shows/seats, checkout, bookings, chat
  (manager)/     schedule console
  (admin)/       overview, users, catalog, theatres, screens, shows, promos, reports, activity
  api/session/   BFF: stores the session as an httpOnly cookie
components/
  ui/            design-system primitives (Button, Input, Badge, Money, …)
  shell/         DashboardShell (operators) + StorefrontShell (customer)
  charts/  admin/ brand/ providers/
lib/
  api/           typed fetch client + ApiError
  auth/          session context, server guard, role map
  realtime/      ws-client (seats) + sse-client (chat)
  design/        tokens, cn, motion
  format/        money (paise→₹), datetime
  hooks/  seat.ts  types.ts  env.ts
proxy.ts         edge auth gate (Next 16 proxy convention; backend owns RBAC)
```

## Scripts

| Script | Purpose |
|---|---|
| `bun run dev` | Dev server (Turbopack) |
| `bun run build` | Production build |
| `bun run start` | Serve the build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |

## Status

- **Phase 0 — scaffold:** ✅ theme system, primitives, role-aware shells, routing.
- **Phase 1 — auth:** ✅ real phone→OTP→session against the backend (BFF + httpOnly bearer, `/me` role resolution, RBAC gating verified end-to-end).
- **Phase 2 — catalog:** ✅ customer movie browse (URL-driven filters, trending rail) and movie detail (cast + grouped showtimes) render live from `/api/movies` + `/api/shows/showtimes`. Typed API modules cover movies, genres, shows, theatres, and bookings; the WS client speaks the real `/ws` seat protocol.
- **Phase 3 — booking flow:** ✅ seat map (`/shows/[id]/seats`) with **live WebSocket availability** + poll fallback, 5-min hold + countdown, checkout (`/checkout/[bookingId]`) with promo apply and **simulated payment** (test-card picker), plus My Bookings + booking detail (confirmation, cancel, refund). Verified end-to-end against the backend: success → CONFIRMED, declined card → PAYMENT_FAILED, seat conflict → SEAT_UNAVAILABLE, refund → REFUNDED.
- **Hall Manager console:** ✅ `/schedule` resolves the manager's assigned screens (server-side discovery; admins see all), shows a per-screen day-grouped schedule, and creates/edits/deletes shows through the rule-validated API. Verified: create → 201, overlap → `overlap_or_gap`, >30 days → `max_advance_days`, non-owned screen → FORBIDDEN, edit + delete OK. Structured rule violations render inline in the form.
- **Admin dashboard:** ✅ all nine sections wired live — Overview (KPIs + revenue chart), Reports (granularity toggle, top movies/theatres), Users (search/filter, disable/enable, assign role), Activity Log (the observability face — filters by action/outcome), Promos, Theatres, Movie catalog (create with genre picker), Screens (interactive **seat-layout builder** → bulk seat generation), and admin override Scheduling. Verified end-to-end: reports summary, activity feed, and every create/mutation (promo, theatre, screen w/ 30 bulk seats, movie, user role/active) succeed through the BFF.

- **AI chatbot:** ✅ `/chat` (full page with conversation rail) + a storefront **drawer** ("Ask AI" from any page). Streams the backend agent over **SSE through the BFF**: block-memoized markdown rendering (adapted from a reference chat impl — only the streaming/markdown internals, not its extra features), **tool-activity chips** driven by `tool_start`/`tool_end` events (27 tools mapped to friendly labels + icons), a distinct **"Booking assistant" chip** for the `delegate_booking` sub-agent, a streaming cursor + thinking dots, stick-to-bottom auto-scroll, suggestion prompts, and conversation resume. Verified: SSE passthrough streams frames (`content-type: text/event-stream`), conversation list + a real multi-turn booking conversation load and render correctly (incl. the confirmed-booking reply).

  > The live token/tool stream needs a valid `OPENROUTER_API_KEY` in `backend/.env` (currently a placeholder → the LLM 401s). Existing persisted conversations show the agent worked end-to-end when a real key was present; restore one to stream live.

- **Assignment gap-closure pass:** ✅ all remaining Part-1 items — the full movie filter set (added **Release-date range + Language** to the 5 existing), movie catalog **edit/update** with **cast rows + trailer URL**, **logout** (user menu on storefront, button on dashboards), screen **equipment types** input, movie-detail **showtime filters** (date/chain/screen-type), and **trailer playback** (modal player). All verified against the backend.

**All three roles + the AI assistant are wired to the built backend (Phases 0–5, admin/reports, chatbot), and every Part 1–3 frontend requirement is covered.** The web app is feature-complete against the current backend.
