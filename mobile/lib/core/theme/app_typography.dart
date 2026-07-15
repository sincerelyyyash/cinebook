import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Type system — a 3-font hierarchy shared with the web dashboard:
///
///   • **Fraunces** (display serif) — headline moments: brand, screen titles,
///     movie titles, hero lines, confirmation. Editorial, premium.
///   • **Inter** (sans workhorse) — body, controls, labels, list items.
///   • **JetBrains Mono** (tabular) — numbers & codes: prices, booking IDs,
///     hold countdowns, transaction refs, OTP. Aligns and reads "technical".
///
/// Roles are wired into the [TextTheme] so every `Theme.of(context).textTheme.*`
/// call across the app inherits the right face automatically. For the mono role
/// (applied at numeric call sites), use [AppFonts.mono].
class AppFonts {
  const AppFonts._();

  /// Editorial serif for headline moments.
  static TextStyle display([TextStyle? style]) => GoogleFonts.fraunces(textStyle: style);

  /// Interface sans — the workhorse.
  static TextStyle sans([TextStyle? style]) => GoogleFonts.inter(textStyle: style);

  /// Tabular mono for numbers, prices, codes and timers.
  static TextStyle mono([TextStyle? style]) => GoogleFonts.jetBrainsMono(
        textStyle: (style ?? const TextStyle()).copyWith(
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      );
}

class AppTypography {
  const AppTypography._();

  static TextTheme textTheme() {
    // Explicit, deliberate scale so hierarchy is intentional (not Material
    // defaults). Body/label = Inter; display/headline = Fraunces.
    TextStyle serif(double size, {FontWeight weight = FontWeight.w600, double h = 1.15, double ls = -0.4}) =>
        AppFonts.display(TextStyle(fontSize: size, fontWeight: weight, height: h, letterSpacing: ls));
    TextStyle sans(double size, {FontWeight weight = FontWeight.w400, double h = 1.4, double ls = 0}) =>
        AppFonts.sans(TextStyle(fontSize: size, fontWeight: weight, height: h, letterSpacing: ls));

    return TextTheme(
      // ── Display / headline → Fraunces ──
      displayLarge: serif(40, weight: FontWeight.w600, h: 1.05, ls: -0.6),
      displayMedium: serif(34, weight: FontWeight.w600, h: 1.08, ls: -0.5),
      displaySmall: serif(29, weight: FontWeight.w600, h: 1.1, ls: -0.5),
      headlineMedium: serif(25, h: 1.12),
      headlineSmall: serif(22, h: 1.15),
      // ── Titles → Inter (semibold/bold) ──
      titleLarge: sans(19, weight: FontWeight.w700, h: 1.2, ls: -0.2),
      titleMedium: sans(16, weight: FontWeight.w600, h: 1.25),
      titleSmall: sans(14, weight: FontWeight.w600, h: 1.3),
      // ── Body → Inter ──
      bodyLarge: sans(16, h: 1.5),
      bodyMedium: sans(14, h: 1.45),
      bodySmall: sans(12.5, h: 1.4),
      // ── Labels → Inter ──
      labelLarge: sans(14, weight: FontWeight.w700, ls: 0.1),
      labelMedium: sans(12.5, weight: FontWeight.w600, ls: 0.1),
      labelSmall: sans(11.5, weight: FontWeight.w600, ls: 0.2),
    ).apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    );
  }
}
