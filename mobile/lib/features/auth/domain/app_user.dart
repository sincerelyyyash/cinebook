import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/domain/enums.dart';

part 'app_user.freezed.dart';
part 'app_user.g.dart';

/// Authenticated user. Backs both `POST /auth/otp/verify` (`{ token, user }`)
/// and `GET /auth/me` (full profile). Endpoints that don't return
/// `preferences`/`createdAt` simply leave them null.
///
/// Note the wire field is `phoneNumber` (not `phone`).
@freezed
class AppUser with _$AppUser {
  const AppUser._();

  const factory AppUser({
    required String id,
    required Role role,
    required String name,
    required String email,
    String? phoneNumber,
    @Default(true) bool isActive,
    Map<String, dynamic>? preferences,
    String? createdAt,
  }) = _AppUser;

  factory AppUser.fromJson(Map<String, dynamic> json) => _$AppUserFromJson(json);

  bool get isCustomer => role == Role.customer;
}
