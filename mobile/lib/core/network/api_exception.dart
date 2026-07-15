import 'package:dio/dio.dart';

/// Typed error surfaced by the API layer, mirroring the backend's error
/// envelope: `{ error: { code, message, details } }`.
///
/// Every repository throws this (never a raw [DioException]) so the UI can
/// switch on [code] — e.g. `HOLD_EXPIRED`, `SEAT_UNAVAILABLE`, `RATE_LIMITED`,
/// `PAYMENT_FAILED`, `PAYMENT_UNAVAILABLE` — and render a precise message.
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.status,
    this.details,
    this.retryAfterSec,
  });

  /// Backend error code, or a synthetic one (`HTTP_500`, `NETWORK`, `TIMEOUT`,
  /// `CANCELLED`, `UNKNOWN`).
  final String code;

  /// Human-readable message safe to show the user.
  final String message;

  /// HTTP status code when the failure came from a response.
  final int? status;

  /// Optional structured details from the backend (e.g. rule violations).
  final Object? details;

  /// Seconds to wait before retrying, for `RATE_LIMITED` / retryable errors.
  final int? retryAfterSec;

  bool get isRateLimited => code == 'RATE_LIMITED';
  bool get isUnauthorized => status == 401 || code == 'UNAUTHORIZED';
  bool get isHoldExpired => code == 'HOLD_EXPIRED';
  bool get isSeatUnavailable => code == 'SEAT_UNAVAILABLE';
  bool get isPaymentFailed => code == 'PAYMENT_FAILED';
  bool get isPaymentUnavailable => code == 'PAYMENT_UNAVAILABLE';

  /// Build from a Dio failure, unwrapping the backend error envelope when
  /// present and falling back to transport-level classification otherwise.
  factory ApiException.fromDio(DioException e) {
    final response = e.response;
    if (response != null) {
      final status = response.statusCode;
      final data = response.data;
      String code = 'HTTP_$status';
      String message = 'Request failed ($status)';
      Object? details;
      int? retryAfterSec;

      if (data is Map && data['error'] is Map) {
        final err = (data['error'] as Map).cast<String, dynamic>();
        code = (err['code'] as String?) ?? code;
        message = (err['message'] as String?) ?? message;
        details = err['details'];
        final d = err['details'];
        if (d is Map && d['retryAfterSec'] is num) {
          retryAfterSec = (d['retryAfterSec'] as num).toInt();
        }
      } else if (data is Map && data['message'] is String) {
        message = data['message'] as String;
      }

      retryAfterSec ??= _retryAfterHeader(response.headers);

      return ApiException(
        code: code,
        message: message,
        status: status,
        details: details,
        retryAfterSec: retryAfterSec,
      );
    }

    // No response — transport-level failure.
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          code: 'TIMEOUT',
          message: 'The request timed out. Check your connection and try again.',
        );
      case DioExceptionType.cancel:
        return const ApiException(code: 'CANCELLED', message: 'Request cancelled.');
      case DioExceptionType.connectionError:
        return const ApiException(
          code: 'NETWORK',
          message: 'Cannot reach the server. Check your connection.',
        );
      default:
        return ApiException(
          code: 'UNKNOWN',
          message: e.message ?? 'Something went wrong. Please try again.',
        );
    }
  }

  static int? _retryAfterHeader(Headers headers) {
    final raw = headers.value('retry-after');
    if (raw == null) return null;
    return int.tryParse(raw);
  }

  @override
  String toString() => 'ApiException($code, $status): $message';
}
