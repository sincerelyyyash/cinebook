import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'core/providers.dart';
import 'features/auth/application/session_controller.dart';

/// Startup sequence:
///   1. warm the secure token cache (fast, local),
///   2. kick off session restore in the background (a `/auth/me` round-trip)
///      so the first frame is the splash rather than a blank/blocked screen,
///   3. run the app inside the shared [ProviderContainer].
Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  final container = ProviderContainer();
  await container.read(tokenStoreProvider).load();
  unawaited(container.read(sessionControllerProvider.notifier).restore());

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const CineBookApp(),
    ),
  );
}
