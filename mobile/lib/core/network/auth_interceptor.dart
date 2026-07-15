import 'package:dio/dio.dart';

import '../storage/token_store.dart';

/// Attaches the bearer token to every outgoing request and detects auth
/// expiry. On a 401 it invokes [onUnauthorized] so the app can clear the
/// session and route back to login.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._tokens, {required this.onUnauthorized});

  final TokenStore _tokens;
  final Future<void> Function() onUnauthorized;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _tokens.current;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      await onUnauthorized();
    }
    handler.next(err);
  }
}
