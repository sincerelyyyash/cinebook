import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/storage/token_store.dart';
import '../domain/app_user.dart';
import 'auth_api.dart';

/// Orchestrates auth flows and owns token persistence. Above this, the session
/// controller only deals in [AppUser] + auth state.
class AuthRepository {
  AuthRepository(this._api, this._tokens);

  final AuthApi _api;
  final TokenStore _tokens;

  Future<OtpRequestResult> requestOtp(String phone) => _api.requestOtp(phone);

  /// Verify the OTP, persist the bearer token, and return the user.
  Future<AppUser> verifyOtp(String phone, String code) async {
    final result = await _api.verifyOtp(phone, code);
    await _tokens.save(result.token);
    return result.user;
  }

  /// Re-hydrate the session from a stored token (startup). Returns null when
  /// there is no token or it's no longer valid.
  Future<AppUser?> restore() async {
    if (!_tokens.hasToken) return null;
    try {
      return await _api.me();
    } catch (_) {
      await _tokens.clear();
      return null;
    }
  }

  /// Best-effort server logout, then always drop the local token.
  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {
      // Even if the server call fails, clear locally.
    } finally {
      await _tokens.clear();
    }
  }

  Future<void> clearToken() => _tokens.clear();
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    AuthApi(ref.watch(apiClientProvider)),
    ref.watch(tokenStoreProvider),
  );
});
