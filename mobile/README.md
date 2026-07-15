# CineBook — Flutter Customer App

The customer-facing mobile client for the CineBook platform (the assignment's
preferred stack). It integrates with the existing backend (`../backend`, Bun +
Express on `:4000`) for the full customer journey — auth, browsing, booking with
live seat availability, simulated payment, booking history — and the streaming
**AI assistant**. Hall Manager / Admin surfaces stay on the web dashboard
(`../frontend`).

> **Status:** integration + logic + architecture are complete and wired
> end-to-end against the backend contract, **and** a full premium dark UI is in
> place — a monochrome (layered blacks + refined greys with a soft platinum
> accent) design system with animations, micro-interactions and haptics
> throughout. All design tokens live in `lib/core/theme/` (colours, typography,
> spacing/radii/motion) so re-skinning is a token change.

### Design system

- **Palette** — `core/theme/app_colors.dart`. Near-black canvas, layered grey
  surfaces, a platinum primary used sparingly for CTAs/active states; only seat
  categories and semantic states carry (muted) colour.
- **Type** — Plus Jakarta Sans via `google_fonts` (`app_typography.dart`).
- **Tokens** — `app_dimens.dart` (spacing, radii, durations/curves).
- **Primitives** — `shared/ui/`: `PressScale` (tap-scale + haptic), `AppButton`
  (gradient primary / tonal / ghost), `CategoryChip`, `Skeleton` shimmer,
  `AppNetworkImage` (shimmer→fade→fallback), `RatingPill`/`MetaPill`/`StatusBadge`,
  themed snackbars.
- **Motion & haptics** — `flutter_animate` for staggered entrances + streaming
  typing dots; `core/ui/haptics.dart` for semantic feedback (selection on seat
  taps/chips/tabs, success on booking, error on decline). Hero poster transition
  from card → detail.

---

## 1. Prerequisites & first-time setup

This repo contains the Dart sources (`lib/`, `pubspec.yaml`, tests). The
platform runner folders (`android/`, `ios/`, …) and the generated model code
are **not** committed — generate them once:

```bash
cd mobile

# 1. Generate the platform folders (keeps lib/ and pubspec.yaml intact).
flutter create .

# 2. Fetch dependencies.
flutter pub get

# 3. Generate freezed / json_serializable model code (*.freezed.dart, *.g.dart).
dart run build_runner build --delete-conflicting-outputs
```

Re-run step 3 whenever a `@freezed` model changes (or use
`dart run build_runner watch` during development).

## 2. Running

The app talks to the backend **directly** (no BFF proxy — that is a web
concern). Point it at your running backend via `--dart-define`. Mind the
emulator host quirk:

| Target                | `API_BASE_URL`            |
| --------------------- | ------------------------- |
| iOS simulator / macOS | `http://localhost:4000`   |
| Android emulator      | `http://10.0.2.2:4000`    |
| Physical device       | `http://<your-LAN-ip>:4000` |

```bash
# Make sure the backend is up first:
#   cd ../backend && docker compose up -d && bun run dev

flutter run --dart-define=API_BASE_URL=http://localhost:4000
# WS_URL is derived from API_BASE_URL automatically; override with
#   --dart-define=WS_URL=ws://localhost:4000/ws  if needed.
```

**Demo logins** (seeded): customer `+919000000003`, manager `+919000000002`,
admin `+919000000001`. In dev the backend echoes the OTP (`OTP_DEV_ECHO`), and
the login screen pre-fills it.

## 3. Architecture

Feature-first + layered, with Riverpod for state/DI and freezed for models.

```
lib/
  main.dart / bootstrap.dart      # entry: warm token cache, restore session, runApp
  app/                            # shell: MaterialApp.router, router + guards, theme, bottom nav
  core/
    config/env.dart               # --dart-define config (API base, WS url)
    network/                      # Dio client, envelope unwrap, typed ApiException,
                                  #   auth interceptor (bearer), retry+backoff interceptor
    realtime/                     # seat WebSocket client, chat SSE client
    storage/                      # secure bearer-token store (Keychain / EncryptedSharedPrefs)
    domain/                       # shared enums, Paginated<T>
    utils/                        # money (paise), date/time
    providers.dart                # composition root (Dio → ApiClient)
  features/<feature>/
    domain/                       # freezed models mirroring the backend types
    data/                         # repository (talks to ApiClient) [+ api for auth]
    application/                  # Riverpod controllers / providers (state + logic)
    presentation/                 # screens + widgets (plain UI)
  shared/widgets/                 # AsyncValueView, ErrorView, EmptyState
```

Features: `auth`, `catalog` (movies/genres/reviews), `shows` (showtimes),
`booking` (seat map + hold + checkout + payment), `bookings` (history),
`chat` (AI assistant), `profile`.

### Backend contract (how integration works)

- **Base:** every REST route under `/api`. Success envelope `{ data: T }`
  (unwrapped centrally in `ApiClient`); paginated `{ data: { data, pagination } }`.
  Errors `{ error: { code, message, details } }` → typed `ApiException` with the
  backend `code` (`HOLD_EXPIRED`, `SEAT_UNAVAILABLE`, `PAYMENT_FAILED`,
  `PAYMENT_UNAVAILABLE`, `RATE_LIMITED` + `retryAfterSec`, …). Money is integer
  **paise**; dates are ISO strings.
- **Auth:** phone → OTP (`/auth/otp/request` → `/auth/otp/verify` → `{ token, user }`).
  The bearer token is stored in the platform secure keystore and attached to
  every request by `AuthInterceptor`. A 401 clears the session and routes to
  login. `GET /auth/me` restores the session on launch.
- **Live seats:** one WebSocket at `/ws`, `{action:'subscribe'|'unsubscribe', showId}`
  → server pushes `{type:'availability', showId, summary, seats}`. The seat map
  merges snapshots live and **polls `GET /shows/:id/seats` as a fallback** while
  the socket is down.
- **Booking flow:** availability → `POST /bookings/holds` (5-min all-or-nothing
  hold) → `POST /bookings` (PENDING, promo applied) → `POST /payments/:id/start`
  → `POST /payments/:id/confirm` (test card → CONFIRMED). Abandoning checkout
  before a booking is created releases the hold.
- **AI chat:** `POST /chat` streamed over **SSE** (`stream:true`). The client
  folds typed events (`tool_start`/`tool_end` → tool chips incl. the
  `delegate_booking` sub-agent, `token` → live text, `conversation`, `done`,
  `error`) into the transcript. History via `GET /chat/conversations[/:id]`.

### Production-quality touches (Part 3)

- **Resilience:** exponential-backoff retries for idempotent requests only
  (never bookings/payments); WebSocket auto-reconnect + polling fallback.
- **Rate limits:** surfaced to the user with the `retryAfterSec` wait time.
- **Secure sessions:** bearer token in the OS keystore; auto-logout on expiry.
- **Cancellation:** in-flight chat streams are cancellable; controllers dispose
  sockets/subscriptions cleanly (`autoDispose`).

## 4. Tests

Pure-Dart unit tests (no codegen needed) cover money formatting and filter
query building:

```bash
flutter test
```

## 5. Notes / follow-ups

- Design system (colors, typography, spacing, motion) — deferred by request.
- `flutter create .` is required once to produce the platform runners.
- Poster/trailer images load from backend-provided URLs.
