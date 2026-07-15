import '../../../core/network/api_client.dart';
import '../domain/app_user.dart';

/// Raw auth endpoints. Returns typed results; leaves session/token persistence
/// to the repository + controller.
class AuthApi {
  AuthApi(this._client);

  final ApiClient _client;

  /// `POST /auth/otp/request` → `{ message, devCode? }`. `devCode` is echoed
  /// only in dev (OTP_DEV_ECHO) to make the flow testable without SMS.
  Future<OtpRequestResult> requestOtp(String phone) {
    return _client.post<OtpRequestResult>(
      '/auth/otp/request',
      body: {'phone': phone},
      decode: (d) {
        final m = (d as Map).cast<String, dynamic>();
        return OtpRequestResult(
          message: m['message'] as String? ?? 'Verification code sent',
          devCode: m['devCode'] as String?,
        );
      },
    );
  }

  /// `POST /auth/otp/verify` → `{ token, user }`.
  Future<VerifyResult> verifyOtp(String phone, String code) {
    return _client.post<VerifyResult>(
      '/auth/otp/verify',
      body: {'phone': phone, 'code': code},
      decode: (d) {
        final m = (d as Map).cast<String, dynamic>();
        return VerifyResult(
          token: m['token'] as String,
          user: AppUser.fromJson((m['user'] as Map).cast<String, dynamic>()),
        );
      },
    );
  }

  /// `GET /auth/me` → full profile.
  Future<AppUser> me() {
    return _client.get<AppUser>(
      '/auth/me',
      decode: (d) => AppUser.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  /// `POST /auth/logout` — revoke the server session.
  Future<void> logout() {
    return _client.post<void>('/auth/logout', decode: (_) {});
  }
}

class OtpRequestResult {
  const OtpRequestResult({required this.message, this.devCode});
  final String message;
  final String? devCode;
}

class VerifyResult {
  const VerifyResult({required this.token, required this.user});
  final String token;
  final AppUser user;
}
