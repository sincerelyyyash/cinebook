import 'package:dio/dio.dart';

import '../config/env.dart';
import 'api_exception.dart';

/// Thin, typed wrapper over Dio. Every method:
///   * unwraps the backend success envelope `{ data: T }` before decoding, and
///   * converts any [DioException] into a typed [ApiException].
///
/// Repositories depend on this — never on Dio directly — so error handling and
/// envelope unwrapping live in exactly one place.
class ApiClient {
  ApiClient(this.dio);

  final Dio dio;

  /// GET → decoded `data`.
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? query,
    required T Function(dynamic data) decode,
    CancelToken? cancelToken,
  }) =>
      _send(path, method: 'GET', query: query, decode: decode, cancelToken: cancelToken);

  /// POST → decoded `data`. Pass `retryable: true` only for genuinely
  /// idempotent-by-design endpoints (never bookings/payments).
  Future<T> post<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    required T Function(dynamic data) decode,
    bool retryable = false,
    CancelToken? cancelToken,
  }) =>
      _send(path,
          method: 'POST',
          body: body,
          query: query,
          decode: decode,
          retryable: retryable,
          cancelToken: cancelToken);

  Future<T> patch<T>(
    String path, {
    Object? body,
    required T Function(dynamic data) decode,
    CancelToken? cancelToken,
  }) =>
      _send(path, method: 'PATCH', body: body, decode: decode, cancelToken: cancelToken);

  Future<T> delete<T>(
    String path, {
    Object? body,
    required T Function(dynamic data) decode,
    CancelToken? cancelToken,
  }) =>
      _send(path, method: 'DELETE', body: body, decode: decode, cancelToken: cancelToken);

  Future<T> _send<T>(
    String path, {
    required String method,
    Object? body,
    Map<String, dynamic>? query,
    required T Function(dynamic data) decode,
    bool retryable = false,
    CancelToken? cancelToken,
  }) async {
    try {
      final res = await dio.request<dynamic>(
        path,
        data: body,
        queryParameters: query,
        cancelToken: cancelToken,
        options: Options(method: method, extra: retryable ? {'retryable': true} : null),
      );
      return decode(_unwrap(res.data));
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Unwrap `{ data: ... }`. 204/empty bodies decode from `null`.
  static dynamic _unwrap(dynamic raw) {
    if (raw == null) return null;
    if (raw is Map && raw.containsKey('data')) return raw['data'];
    return raw;
  }

  /// Build a configured Dio instance. Interceptors (auth, retry, logging) are
  /// added by the provider layer so this stays free of app dependencies.
  static Dio createDio() {
    return Dio(
      BaseOptions(
        baseUrl: Env.apiBase,
        connectTimeout: Env.connectTimeout,
        receiveTimeout: Env.receiveTimeout,
        headers: {'Accept': 'application/json'},
        // Let the envelope-aware error mapper handle non-2xx instead of Dio.
        validateStatus: (status) => status != null && status >= 200 && status < 300,
      ),
    );
  }
}
