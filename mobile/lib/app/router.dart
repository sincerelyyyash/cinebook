import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_dimens.dart';
import '../features/auth/application/session_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/booking/domain/booking_models.dart';
import '../features/booking/presentation/checkout_screen.dart';
import '../features/booking/presentation/seat_map_screen.dart';
import '../features/bookings/presentation/booking_detail_screen.dart';
import '../features/catalog/presentation/movie_detail_screen.dart';
import '../features/shows/presentation/showtimes_screen.dart';
import 'home_shell.dart';

/// App router with a session-driven redirect guard:
///   * `unknown`  → splash while the stored token is restored
///   * signed-out → `/login` (everything else is gated)
///   * signed-in  → into the app; `/login` bounces to `/`
///
/// Rebuilds whenever the session changes via [refreshListenable].
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _SessionRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final status = ref.read(sessionControllerProvider).status;
      final loc = state.matchedLocation;

      if (status == SessionStatus.unknown) {
        return loc == '/splash' ? null : '/splash';
      }
      final authed = status == SessionStatus.authenticated;
      if (!authed) return loc == '/login' ? null : '/login';
      // Authenticated: keep users out of login/splash.
      if (loc == '/login' || loc == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/', builder: (_, __) => const HomeShell()),
      GoRoute(
        path: '/movies/:id',
        builder: (_, s) => MovieDetailScreen(movieId: s.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'showtimes',
            builder: (_, s) => ShowtimesScreen(movieId: s.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/shows/:showId/seats',
        builder: (_, s) => SeatMapScreen(showId: s.pathParameters['showId']!),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, s) {
          final hold = s.extra;
          // Checkout requires a live hold handed over from the seat map.
          if (hold is! Hold) return const _MissingHoldScreen();
          return CheckoutScreen(hold: hold);
        },
      ),
      GoRoute(
        path: '/bookings/:id',
        builder: (_, s) => BookingDetailScreen(bookingId: s.pathParameters['id']!),
      ),
    ],
    errorBuilder: (_, s) => Scaffold(
      appBar: AppBar(title: const Text('Not found')),
      body: Center(child: Text('No route for ${s.uri}')),
    ),
  );
});

/// Bridges Riverpod's session provider to go_router's [Listenable] refresh.
class _SessionRefresh extends ChangeNotifier {
  _SessionRefresh(Ref ref) {
    _sub = ref.listen(
      sessionControllerProvider,
      (_, __) => notifyListeners(),
      fireImmediately: false,
    );
  }
  late final ProviderSubscription _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 72,
              width: 72,
              decoration: BoxDecoration(
                gradient: AppColors.surfaceSheen,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(PhosphorIconsFill.filmSlate, size: 36, color: AppColors.textPrimary),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .scaleXY(begin: 1, end: 1.06, duration: 900.ms, curve: Curves.easeInOut),
            const SizedBox(height: 20),
            Text('CineBook', style: Theme.of(context).textTheme.titleLarge)
                .animate()
                .fadeIn(duration: 500.ms),
          ],
        ),
      ),
    );
  }
}

class _MissingHoldScreen extends StatelessWidget {
  const _MissingHoldScreen();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('This checkout session is no longer available. Please select seats again.',
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: () => context.go('/'), child: const Text('Back to movies')),
            ],
          ),
        ),
      ),
    );
  }
}
