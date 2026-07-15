import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../features/auth/application/session_controller.dart';
import 'network/api_client.dart';
import 'network/auth_interceptor.dart';
import 'network/retry_interceptor.dart';
import 'storage/token_store.dart';

/// Core dependency-injection graph. These providers are the composition root:
/// storage → token store → Dio (with interceptors) → [ApiClient]. Feature
/// repositories depend only on [apiClientProvider].

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
});

/// Warmed at startup in `bootstrap()` via [TokenStore.load]; overridden with
/// the loaded instance so interceptors read the token synchronously.
final tokenStoreProvider = Provider<TokenStore>((ref) {
  return TokenStore(ref.watch(secureStorageProvider));
});

final dioProvider = Provider<Dio>((ref) {
  final dio = ApiClient.createDio();
  final tokens = ref.watch(tokenStoreProvider);

  dio.interceptors.add(
    AuthInterceptor(
      tokens,
      onUnauthorized: () async {
        // Token rejected by the backend — drop the session; the router's
        // redirect guard sends the user back to login.
        await ref.read(sessionControllerProvider.notifier).onAuthExpired();
      },
    ),
  );
  dio.interceptors.add(RetryInterceptor(dio));

  if (kDebugMode) {
    dio.interceptors.add(LogInterceptor(
      requestBody: false,
      responseBody: false,
      requestHeader: false,
      responseHeader: false,
      logPrint: (o) => debugPrint('[dio] $o'),
    ));
  }

  return dio;
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(dioProvider));
});
