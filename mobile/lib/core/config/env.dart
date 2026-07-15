/// Runtime configuration, injected at build/run time via `--dart-define`.
///
/// The mobile app talks to the CineBook backend **directly** (no BFF proxy —
/// that is a web-only concern). Every REST route is mounted under `/api`; the
/// seat-availability WebSocket lives at `/ws`.
///
/// Example:
/// ```
/// flutter run \
///   --dart-define=API_BASE_URL=http://10.0.2.2:4000 \
///   --dart-define=WS_URL=ws://10.0.2.2:4000/ws
/// ```
///
/// Defaults target a local backend. Note the platform quirk: the Android
/// emulator reaches the host machine at `10.0.2.2`, the iOS simulator at
/// `localhost`. Pick the base URL accordingly (or override per-flavor).
class Env {
  const Env._();

  /// Backend origin, no trailing `/api` (e.g. `http://localhost:4000`).
  static const String apiOrigin = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:4000',
  );

  /// Route prefix every REST endpoint is mounted under.
  static const String apiPrefix = '/api';

  /// Absolute REST base, e.g. `http://localhost:4000/api`.
  static String get apiBase => '$apiOrigin$apiPrefix';

  /// WebSocket URL for live seat availability. Derived from [apiOrigin] when
  /// not explicitly overridden.
  static String get wsUrl {
    const explicit = String.fromEnvironment('WS_URL');
    if (explicit.isNotEmpty) return explicit;
    final ws = apiOrigin.replaceFirst(RegExp(r'^http'), 'ws');
    return '$ws/ws';
  }

  /// Product name shown in the app shell.
  static const String appName = 'CineBook';

  /// Network timeouts.
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
