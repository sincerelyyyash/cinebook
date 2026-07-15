# CineBook: AI-Powered Movie Booking Platform

A production-quality movie-booking platform whose core is an **AI chatbot** that finds and books movies through natural conversation. It serves three roles. **Customers** book tickets and chat with the assistant, **Hall Managers** schedule shows for their screens, and **Admins** run everything from a dashboard.

This repository is the complete submission: a fully-featured backend, a role-aware web app, and a Flutter mobile customer app (the assignment's preferred stack).

```
cinebook/
├── backend/    Bun · Express · TypeScript · Prisma/Postgres · Redis/BullMQ · OpenRouter   (the core)
├── frontend/   Next.js 16 web app: Customer storefront + Hall-Manager console + Admin dashboard
└── mobile/     Flutter customer app: full booking journey + streaming AI assistant
```

Each part has its own deep-dive docs: [`backend/README`](./backend/README.md), [`frontend/README`](./frontend/README.md), and [`mobile/README`](./mobile/README.md). **This file is the map and the rationale;** start here.

---

## 1. What was built (assignment coverage at a glance)

| Assignment part | Where | Status |
|---|---|---|
| **Part 1, Core**: auth + RBAC, movie discovery/filters, seat map + 5-min holds, simulated payments + refunds, hall-manager scheduling rules, admin dashboard | backend + frontend + mobile | ✅ |
| **Part 2, AI Chatbot** (the most-weighted section): 25+ actions, task delegation, long-conversation context, action chaining | backend `src/chatbot/` (UI in frontend + mobile) | ✅ |
| **Part 3, Production quality**: activity logs, metrics, request tracing, retries, circuit breaker, three rate limits | backend | ✅ |
| **Data model** (12 required entities) | `backend/prisma/schema.prisma` | ✅ |
| **Custom agent loop** (no LangChain/AutoGPT) | `backend/src/chatbot/agent/loop.ts` | ✅ |

A per-requirement compliance checklist is in [§6](#6-assignment-compliance-checklist).

---

## 2. Quick start

**Prerequisites:** [Bun](https://bun.sh) ≥ 1.1 and Docker (for Postgres + Redis). For the mobile app: the Flutter SDK.

### Backend (required by everything else)

```bash
cd backend
docker compose up -d                        # Postgres + Redis
cp .env.example .env                         # set JWT_* (32+ chars) and OPENROUTER_API_KEY
bun install
bun run prisma:generate && bun run prisma:migrate
bun run db:seed                              # demo movies, theatres, shows, users
bun run dev                                  # API on http://localhost:4000
bun run dev:worker                           # BullMQ worker in a separate terminal (hold auto-expiry)
```

Health: `curl localhost:4000/api/health/ready`

### Web app

```bash
cd frontend
bun install
cp .env.example .env.local                   # API_BASE_URL points to http://localhost:4000
bun run dev                                  # http://localhost:3000
```

### Mobile app

```bash
cd mobile
flutter create .                             # generate platform runners (lib/ is committed, runners are not)
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # freezed / json_serializable codegen
flutter run --dart-define=API_BASE_URL=http://localhost:4000   # Android emulator: use http://10.0.2.2:4000
```

### Demo credentials (seeded)

Login is passwordless phone-OTP. **The SMS is simulated.** In dev the backend echoes the code in the response and the login screens pre-fill it, so no real phone is needed.

| Role | Phone |
|---|---|
| Admin | `+919000000001` |
| Hall Manager | `+919000000002` |
| Customer | `+919000000003` |

### Payment test cards

| Card number | Behaviour |
|---|---|
| `4111111111111111` | Succeeds |
| `4000000000000002` | Declines |
| `4000000000009995` | Insufficient funds |
| `4000000000000119` | Randomly fails |
| `4000000000000000` | Gateway error (trips the circuit breaker) |

---

## 3. Architecture: how the parts fit

```
   Flutter app  ─────────────┐                 ┌── WebSocket /ws   (live seat availability)
   (direct, bearer token)    │                 │
                             ▼                 ▼
   Next.js web  ──BFF proxy──►   Express API (:4000)  ──► Postgres (Prisma)   durable state
   (httpOnly cookie)             │  services + RBAC   ──► Redis            seat holds, cache, rate limits
                                 │                    ──► BullMQ           delayed hold-expiry jobs
                                 │
                                 └── /api/chat  ──►  Agent loop ──► OpenRouter (LLM, tool-calling)
                                     (SSE stream)     └─ 28 tools → the same services above
```

**One backend, two clients, two real-time channels.** The web app keeps the bearer token server-side (an httpOnly cookie plus a BFF proxy, so there is no token in JS and no CORS); the mobile app holds the token in the OS secure keystore and calls the API directly. Live seat maps stream over **WebSocket** (bidirectional, many viewers per show); chat streams over **SSE** (one-way token and tool-activity frames). The chatbot's tools are thin wrappers over the exact same services the REST endpoints use, so the AI can do nothing a normal API caller cannot, and every booking rule is enforced in one place.

---

## 4. Why this stack (technology choices and rationale)

The assignment lets candidates pick their tools *but asks them to explain why*. Each choice below is deliberate.

| Choice | Why this, over the alternatives |
|---|---|
| **Bun** (runtime, package manager, test runner) | One toolchain instead of node + npm + ts-node + jest. Native TypeScript execution (no build step in dev), fast installs, and a built-in test runner used for the whole suite. The same package manager across backend and web keeps the repo consistent. |
| **Express + TypeScript (strict)** | The assignment explicitly rewards *custom AI architecture*, not framework magic. Express is deliberately thin, so the interesting code (the agent loop, the concurrency-safe booking engine) stays front and centre with no hidden behaviour. Strict TS gives compile-time safety across a large domain. |
| **PostgreSQL + Prisma** (over MongoDB) | The domain is deeply relational (users, bookings, seats, shows, screens, theatres) and correctness hinges on **real constraints**: the double-booking guard is a DB-level `@@unique(showId, seatId)` backed by transactions, exactly what a relational engine gives and a document store does not. Prisma adds a schema-first, type-safe data layer with first-class migrations. |
| **Redis + BullMQ** | The brief itself calls for Redis for temporary data. Two jobs: (1) **atomic 5-minute seat holds** via a Redis **Lua** script (all-or-nothing across N seats, no race), and (2) **BullMQ delayed jobs** that auto-release a hold exactly at expiry, a durable timer that survives restarts rather than an in-process `setTimeout`. Redis also backs caching and the rate limiters. |
| **OpenRouter** (LLM gateway) | One OpenAI-compatible endpoint fronts many models, so the model is a config value (`OPENROUTER_MODEL`) with no vendor lock-in; swap DeepSeek, GPT, or Claude without code changes. The assignment allows any provider, and the **agent loop is hand-written** (a hard requirement: no LangChain/AutoGPT). |
| **WebSocket *and* SSE** (right tool per direction) | Seat availability is **bidirectional and shared** (many clients subscribe/unsubscribe per show, and the server pushes on every hold/book/release), so WebSocket fits. Chat is **one-way streaming** of tokens and tool events, so SSE fits: it is simpler, auto-reconnects, and rides plain HTTP through the web app's BFF proxy. Using each where it belongs beats forcing everything through one channel. |
| **Better Auth** (phone-OTP + bearer) | Maps directly onto "phone number verification (simulated)" with a passwordless OTP plugin, persistent sessions ("stay logged in"), and bearer tokens that suit a mobile client. Only the SMS *send* is stubbed; code generation, hashing, expiry, and attempt limits are all real. |
| **Next.js 16 (App Router)** for web | One app serves all three role shells. Server Components make catalog reads fast, and a **BFF proxy** keeps the session token in an httpOnly cookie (never in JS, no CORS to configure). The admin dashboard is inherently a web surface. |
| **Flutter** for mobile | The assignment's **preferred stack**. Riverpod + freezed give typed, testable state and immutable models that mirror the backend contract; Dio interceptors centralise auth, retries, and envelope unwrapping. |

Cross-cutting principles: **money is stored as integer paise** (never floats); **all failures are typed** (`{ error: { code, message, details } }`) so every client branches on a stable `code`; and **every request carries a traceId** (AsyncLocalStorage) that flows through logs and metrics.

---

## 5. The AI chatbot (Part 2, the core)

Full detail is in [`backend/README`](./backend/README.md#chatbot); the essentials:

- **Custom tool-calling agent loop**, no agent framework. One reusable `runAgentLoop` drives the model-and-tool cycle with an iteration cap, structured tool-call auditing, and metrics on every call.
- **28 tools + `delegate_booking`**, in logical groups (movie, booking, payment, profile/support), comfortably past the "20+ actions" bar. Every action named in the assignment is implemented; see the mapping in [`backend/README`](./backend/README.md#chatbot).
- **Task delegation.** For a complex request ("book 2 tickets for Inception at PVR tomorrow evening"), the orchestrator hands off to a focused **booking sub-agent** (the same loop, a restricted toolset) that searches, finds shows, checks seats, and holds, then reports back so the main chat continues.
- **Long-conversation context.** Turns are persisted, with rolling-summary compaction and preference memory, so a 20+-action conversation stays coherent without losing earlier intent.
- **Action chaining.** IDs flow from tool to tool (movie id, then showtimes, then show id, then seats, then hold, then booking, then payment), verified live end-to-end.
- **Resilience, proven.** In a live run against a real model, the tools returned typed errors (a "Hold not found" on an expired hold, a hallucinated show id) and the loop **self-corrected** and still completed a correct, paid booking with consistent DB state.

Both clients render this. The web app has a `/chat` page plus an "Ask AI" storefront drawer; the mobile app has a full chat feature. Both stream tokens and show **tool-activity chips** (including a distinct "Booking assistant" chip for the sub-agent) over SSE.

---

## 6. Assignment compliance checklist

**Part 1, Core Application**
- [x] Secure phone-OTP login (simulated), persistent sessions, role-based access (Customer / Hall Manager / Admin)
- [x] Movie filters: release date, genre, chain, screen type, format, language, age rating
- [x] Booking journey: pick movie, choose show, visual seat map (4 categories, colour-coded, live availability), 5-min hold, pay, confirmation
- [x] Simulated payments: test cards, 1 to 3 second latency, always/never/random outcomes, unique txn ids, refunds
- [x] Hall-manager scheduling rules: no overlap, 30-min minimum gap, 30-day maximum window, future-only, immutable-if-booked, own-screens-only, with explainable violations
- [x] Admin dashboard: user management, movie catalog, theatre/screen config, reports (daily/weekly/monthly), override scheduling, activity log

**Part 2, AI Chatbot**
- [x] 20+ actions in logical groups (28 tools + delegate), where the AI decides which to use
- [x] Delegates complex tasks to a specialised booking assistant
- [x] Handles long conversations (context management + compaction)
- [x] Chains actions (ids flow between tools)
- [x] Custom-built loop, no agent frameworks

**Part 3, Production quality**
- [x] Activity logs (who, what, when, duration, outcome), key metrics (errors, conversation length), request tracing (traceId)
- [x] Automatic retries with backoff; circuit breaker on payments
- [x] Rate limits: chat 30/min/user, bookings 5/hr/user, phone-OTP 5/hr/number, with retry-after

**Technical details**
- [x] Node-family backend (Bun/Express), Postgres + Redis, web frontend (Next.js), Flutter app
- [x] All 12 required data entities
- [x] Documentation (this file plus four sub-project docs)

---

## 7. Testing

The backend ships an automated suite (`cd backend && bun test`, with Postgres + Redis up): 37 tests across **unit** (circuit breaker, retry/backoff, scheduling rules, seat pricing, promo math, seat-layout generator, agent loop) and **integration** (the full booking flow including contention and auto-expiry, the scheduling rule engine, and the chatbot end-to-end via a scripted provider). `backend/scripts/chat-e2e.ts` exercises the whole agent pipeline against real services. The web and mobile apps each carry their own checks (`bun run typecheck` and `flutter test`).

---

## 8. Submission notes

- **Deadline:** 36 hours from receipt (per the assignment).
- **Preferred stack, Flutter:** delivered as the customer mobile app (`mobile/`); the web app covers the manager and admin surfaces a phone app is not meant for.
- The assignment document specifies **no submission channel** (no repo URL, email, or portal), so follow whatever instructions accompanied the assignment email.
</content>
