import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';

/// Automatic retries with exponential backoff for transient failures
/// (network drops, timeouts, 502/503/504), satisfying §3.2 "handle failures
/// gracefully". Only **safe/idempotent** requests are retried (GET, plus any
/// request explicitly opted in via `options.extra['retryable'] == true`), so we
/// never double-submit a booking or payment.
class RetryInterceptor extends Interceptor {
  RetryInterceptor(this._dio, {this.maxRetries = 3, this.baseDelay = const Duration(milliseconds: 300)});

  final Dio _dio;
  final int maxRetries;
  final Duration baseDelay;
  final _rng = Random();

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    final attempt = (options.extra['retry_attempt'] as int?) ?? 0;

    if (!_shouldRetry(err, options) || attempt >= maxRetries) {
      return handler.next(err);
    }

    // Exponential backoff with jitter: base * 2^attempt ± 20%.
    final expMs = baseDelay.inMilliseconds * pow(2, attempt);
    final jitter = 1 + (_rng.nextDouble() * 0.4 - 0.2);
    await Future<void>.delayed(Duration(milliseconds: (expMs * jitter).round()));

    final next = options.copyWith(extra: {...options.extra, 'retry_attempt': attempt + 1});
    try {
      final response = await _dio.fetch<dynamic>(next);
      return handler.resolve(response);
    } on DioException catch (e) {
      return handler.next(e);
    }
  }

  bool _shouldRetry(DioException err, RequestOptions options) {
    final method = options.method.toUpperCase();
    final optedIn = options.extra['retryable'] == true;
    final idempotent = method == 'GET' || method == 'HEAD';
    if (!idempotent && !optedIn) return false;

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return true;
      case DioExceptionType.badResponse:
        final code = err.response?.statusCode ?? 0;
        return code == 502 || code == 503 || code == 504;
      default:
        return false;
    }
  }
}
