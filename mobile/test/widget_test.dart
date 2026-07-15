import 'package:cinebook/app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// The app root (CineBookApp) needs a warmed ProviderScope + network, so the
// meaningful coverage lives in the unit tests (money_test, movie_filters_test).
// This is a minimal smoke test that the theme builds a MaterialApp.
void main() {
  testWidgets('theme builds a MaterialApp', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark(),
        home: const Scaffold(body: Center(child: Text('CineBook'))),
      ),
    );
    expect(find.text('CineBook'), findsOneWidget);
  });
}
