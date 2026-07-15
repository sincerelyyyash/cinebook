import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';
import '../domain/app_user.dart';

enum SessionStatus { unknown, authenticated, unauthenticated }

/// Global auth state. `unknown` is the startup state while we try to restore a
/// stored token; the router shows a splash until it resolves.
class SessionState {
  const SessionState({required this.status, this.user});

  final SessionStatus status;
  final AppUser? user;

  const SessionState.unknown() : status = SessionStatus.unknown, user = null;

  bool get isAuthenticated => status == SessionStatus.authenticated && user != null;

  SessionState copyWith({SessionStatus? status, AppUser? user, bool clearUser = false}) {
    return SessionState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
    );
  }
}

/// Owns the authenticated-session lifecycle. Auth expiry (triggered from the
/// Dio interceptor on a 401) funnels through [onAuthExpired].
class SessionController extends Notifier<SessionState> {
  @override
  SessionState build() => const SessionState.unknown();

  AuthRepository get _repo => ref.read(authRepositoryProvider);

  /// Startup: re-hydrate from a stored token, else land unauthenticated.
  Future<void> restore() async {
    final user = await _repo.restore();
    state = user != null
        ? SessionState(status: SessionStatus.authenticated, user: user)
        : const SessionState(status: SessionStatus.unauthenticated);
  }

  /// Called by the login flow after a successful OTP verification.
  void setAuthenticated(AppUser user) {
    state = SessionState(status: SessionStatus.authenticated, user: user);
  }

  /// Refresh the cached profile (e.g. after a preferences update).
  Future<void> refreshProfile() async {
    final user = await _repo.restore();
    if (user != null) {
      state = SessionState(status: SessionStatus.authenticated, user: user);
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const SessionState(status: SessionStatus.unauthenticated);
  }

  /// Token rejected by the backend — clear locally and force re-login.
  Future<void> onAuthExpired() async {
    if (state.status == SessionStatus.unauthenticated) return;
    await _repo.clearToken();
    state = const SessionState(status: SessionStatus.unauthenticated);
  }
}

final sessionControllerProvider =
    NotifierProvider<SessionController, SessionState>(SessionController.new);

/// Convenience: the current user (null when not authenticated).
final currentUserProvider = Provider<AppUser?>((ref) {
  return ref.watch(sessionControllerProvider).user;
});
