# CineBook Backend

AI-powered movie booking platform — backend API.

**Stack:** Bun · Express · TypeScript · Prisma (PostgreSQL) · Redis + BullMQ · OpenRouter (LLM) · WebSocket + SSE

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- Docker (for Postgres + Redis) — or your own Postgres/Redis instances

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Configure env
cp .env.example .env        # then fill in secrets (JWT_* at least 32 chars; OPENROUTER_API_KEY)

# 4. Generate Prisma client + run migrations
bun run prisma:generate
bun run prisma:migrate       # creates the first migration

# 5. (later) Seed demo data
bun run db:seed

# 6. Run
bun run dev                  # API on http://localhost:4000
bun run dev:worker           # BullMQ worker (separate terminal)
```

### Health check

```bash
curl http://localhost:4000/api/health/live    # liveness
curl http://localhost:4000/api/health/ready    # readiness (checks DB + Redis)
```

---

## Scripts

| Script | Purpose |
|---|---|
| `bun run dev` | API server with hot reload |
| `bun run dev:worker` | Background job worker with hot reload |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run prisma:migrate` | Create/apply dev migration |
| `bun run prisma:studio` | Prisma Studio (DB GUI) |
| `bun run db:seed` | Seed demo dataset |
| `bun run db:reset` | Reset DB + re-run migrations |
| `bun test` | Run all tests (needs Postgres + Redis up) |
| `bun run test:unit` | Fast pure-logic unit tests |
| `bun run test:integration` | End-to-end service tests |

---

## Project layout

Layered structure — grouped by responsibility, one file per feature per layer.
Request flow: `routes → middleware → validator → controller → service → Prisma`.

```
src/
  config/        env validation + business-rule constants
  infra/         prisma client, redis clients, BullMQ queue registry
  lib/           logger, errors, async-context, retry, circuit-breaker, pagination, http helpers
  auth/          Better Auth instance + session resolver
  middleware/    request-context, authenticate, authorize, rate-limit, validate, error-handler
  routes/        <feature>.routes.ts + index aggregator
  controllers/   <feature>.controller.ts
  services/      <feature>.service.ts  (business logic)
  validators/    <feature>.validator.ts (zod DTOs)
  types/         shared + per-feature types
  chatbot/       AI subsystem: agent loop, tools, llm adapter, context mgmt
  realtime/      websocket (seat availability, chat streaming)
  observability/ metrics + tracing
  app.ts server.ts worker.ts
```

## Auth (Phase 1)

Passwordless phone-OTP via [Better Auth](https://better-auth.com) + bearer tokens.
Demo users are seeded (`bun run db:seed`); in dev the OTP is echoed in the response.

```bash
# 1. request a code (dev echoes it)
curl -XPOST localhost:4000/api/auth/otp/request \
  -H 'content-type: application/json' -d '{"phone":"+919000000001"}'
# -> { "data": { "message": "...", "devCode": "600657" } }

# 2. verify -> bearer token
curl -XPOST localhost:4000/api/auth/otp/verify \
  -H 'content-type: application/json' -d '{"phone":"+919000000001","code":"600657"}'
# -> { "data": { "token": "…", "user": { "role": "ADMIN", … } } }

# 3. use it
curl localhost:4000/api/auth/me -H "authorization: Bearer <token>"
```

Seeded demo accounts: `+919000000001` (ADMIN), `+919000000002` (HALL_MANAGER), `+919000000003` (CUSTOMER).

## Testing

`bun test` — 37 tests across unit + integration (Postgres + Redis must be running).

- **Unit** (`tests/unit/`, no infra logic): circuit breaker (open/half-open/close, declines don't trip), retry with backoff, scheduling window rules, seat pricing, promo discount math, seat-layout generator, route normalization, and the agent loop (tool execution, events, iteration cap).
- **Integration** (`tests/integration/`, real services + DB/Redis): the full booking flow (availability → atomic hold → contention → book → pay → confirm → refund → auto-expiry), the scheduling rule engine (overlap/past/30-day/ownership/admin-override/immutable-if-booked), and the chatbot end-to-end via a scripted provider (delegation → sub-agent chaining → cross-turn memory → paid booking). Each integration file creates an isolated fixture and tears it down.

## Status

- **Phase 0 — Scaffold:** ✅ runnable app, full data model, cross-cutting infra (logger, errors, tracing, rate limiting, queues, graceful shutdown).
- **Phase 1 — Auth & RBAC:** ✅ Better Auth phone-OTP + bearer tokens, role-based `authorize()` guards, admin user management (list / edit name+email / disable / assign-role), self-service profile + preferences, activity logging, OTP rate limiting (5/hr/phone).
- **Phase 2 — Catalog:** ✅ movies with the full filter set (genre, language, age rating, release-date range, + chain/screen-type/format via shows), details/cast/similar/trending/upcoming, reviews (list + post, aggregated rating), theatres (chain/city/search), screens with a **seat-layout generator** + manager assignment, genres. Admin CRUD throughout.
- **Phase 3 — Show Scheduling:** ✅ the business-rule engine (§1.3) — no overlap, ≥30-min cleaning gap, ≤30-day advance window, future-only, **immutable-if-booked**, and Hall-Manager screen-ownership scoping with Admin override. Each violation returns an explainable `SHOW_RULE_VIOLATION`. Per-screen advisory locking prevents scheduling races. Public show listing/filtering + grouped movie showtimes + per-category pricing.
- **Phase 4 — Booking Core:** ✅ concurrency-safe seat booking. Atomic **Redis-Lua 5-minute holds** (all-or-nothing), a durable `SeatHold` row + **BullMQ delayed job** that auto-releases on expiry, the hold→book→confirm pipeline with **BookedSeat `@@unique(showId,seatId)`** as the final double-booking guard, cancel (frees seats), booking history/status by owner, and **WebSocket live seat availability** (`ws://…/ws`) pushed on every hold/release/book/cancel/expiry.
- **Phase 5 — Payments:** ✅ simulated gateway (test cards: succeed / decline / insufficient / random-fail / gateway-error, 1–3s latency, unique txn IDs) wrapped in a **circuit breaker** (opens after 5 gateway errors → fast-fail `PAYMENT_UNAVAILABLE`, half-opens after cooldown) + **retry-with-backoff** (declines don't trip the breaker). Start/confirm/refund flow, **payment gates booking confirmation**, and **promo codes** (percent/flat, caps, min-amount, usage-limit, date-window) with preview + apply.
- **Phase 6 — Admin & Observability:** ✅ **reports** (summary: bookings by status, seats sold, gross/refunded/net revenue; revenue timeseries daily/weekly/monthly; top movies/theatres — SQL aggregates), the **activity-log query API** (filter by actor/action-prefix/success/date, paginated), and **Prometheus `/metrics`** (request throughput + latency histograms with id-normalized route labels, error counts by code, payment/booking outcome counters).
- **Phase 7 — AI Chatbot** ⭐ ✅ a **custom tool-calling agent loop** (no frameworks) over OpenRouter, **28 tools + `delegate_booking`** across movie/booking/payment/profile groups (thin wrappers over the services above), a delegating **booking sub-agent** (`delegate_booking` → same loop, focused toolset), **action chaining** (ids flow tool→tool), **long-conversation context** (persisted turns + rolling summary compaction + preference memory), and **SSE streaming** with live tool-activity events. Every tool call is audited + metered.

### Chatbot

```
POST /api/chat  { message, conversationId?, stream? }   # SSE by default; stream:false → JSON
GET  /api/chat/conversations  ·  /conversations/:id
```

**Tools (28 + delegate_booking):** movie — search_movies, get_movie_details, get_cast, get_reviews, get_showtimes, suggest_similar, get_trending, get_upcoming, list_languages, list_genres · booking — find_theatres, get_screen_info, check_seat_availability, hold_seats, release_seats, create_booking, check_booking_status, cancel_booking, view_booking_history · payment — apply_promo, preview_promo, start_payment, confirm_payment · profile/support — get_profile, update_preferences, get_recommendations, get_offers, contact_support · plus **delegate_booking** (sub-agent handoff).

**Note:** set a real `OPENROUTER_API_KEY` in `.env` to chat against a live model. `scripts/chat-e2e.ts` verifies the full agent pipeline (delegation, chaining, cross-turn memory, promo, payment) end-to-end against real services using a scripted provider — `bun run scripts/chat-e2e.ts` (DB + Redis up).

### Admin + observability

```
GET  /metrics                          # Prometheus scrape (request latency, errors, domain counters)
GET  /api/admin/reports/summary        ?from=&to=
GET  /api/admin/reports/revenue        ?granularity=daily|weekly|monthly
GET  /api/admin/reports/top-movies  ·  /top-theatres
GET  /api/admin/activity               ?action=booking.&success=false&actorId=&from=&to=
```

### Payment + promo flow

```
GET  /api/promos                       # active offers
POST /api/promos/apply {code,amount}   # preview a discount
POST /api/bookings/:id/promo {code}    # apply to a PENDING booking
POST /api/payments/:bookingId/start    # create payment intent
POST /api/payments/:bookingId/confirm {cardNumber}   # charge → confirm booking
POST /api/payments/:bookingId/refund   # refund + free seats
POST /api/bookings/:id/cancel          # cancel — auto-refunds if already paid
```

**Test cards:** `4111111111111111` succeeds · `4000000000000002` declines · `4000000000009995` insufficient · `4000000000000119` randomly fails · `4000000000000000` gateway error (trips breaker).

### Booking flow

```
GET  /api/shows/:id/seats              # live seat map: AVAILABLE | HELD | BOOKED + prices
POST /api/bookings/holds               # atomic 5-min hold  → { holdId, expiresAt }
DEL  /api/bookings/holds/:id           # release a hold
POST /api/bookings   { holdId }        # create PENDING booking (rate-limited 5/hr)
POST /api/bookings/:id/confirm         # → CONFIRMED (writes BookedSeat rows)  [Phase 5 gates on payment]
POST /api/bookings/:id/cancel          # frees seats
GET  /api/bookings  ·  /:id  ·  /:id/status
# WebSocket: connect /ws → { action:"subscribe", showId } → { type:"availability", summary, seats }
```

### Catalog endpoints (excerpt)

```
GET  /api/genres                       GET  /api/movies?genre=Sci-Fi&language=English
GET  /api/movies/trending              GET  /api/movies/upcoming
GET  /api/movies/:id                   GET  /api/movies/:id/cast|similar|reviews
POST /api/movies/:id/reviews  (auth)   POST /api/movies  (admin)
GET  /api/theatres?chain=PVR&city=Bangalore   GET /api/theatres/:id  /:id/screens
GET  /api/screens/:id  (seat map)      POST /api/screens  (admin, seat-layout generator)
GET  /api/shows?movieId=&city=&chain=&screenType=&format=&date=
GET  /api/shows/showtimes?movieId=     GET  /api/shows/:id  (per-category pricing)
POST /api/shows  (manager/admin)       PATCH/DELETE /api/shows/:id
```

Next: **Phase 8 — Hardening & Docs** (integration tests, API documentation, final polish).
