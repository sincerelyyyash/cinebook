import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the bearer session token in the platform secure keystore
/// (Keychain on iOS, EncryptedSharedPreferences on Android), satisfying the
/// assignment's "stay logged in securely across sessions" requirement.
///
/// The backend issues a bearer token from `POST /api/auth/otp/verify`; every
/// authenticated request carries it as `Authorization: Bearer <token>`.
class TokenStore {
  TokenStore(this._storage);

  final FlutterSecureStorage _storage;
  static const _key = 'cb_session_token';

  String? _cached;

  /// Cheap synchronous access for interceptors after [load] has run once.
  String? get current => _cached;

  bool get hasToken => _cached != null && _cached!.isNotEmpty;

  /// Warm the in-memory cache from secure storage (call once at startup).
  Future<String?> load() async {
    _cached = await _storage.read(key: _key);
    return _cached;
  }

  Future<void> save(String token) async {
    _cached = token;
    await _storage.write(key: _key, value: token);
  }

  Future<void> clear() async {
    _cached = null;
    await _storage.delete(key: _key);
  }
}
