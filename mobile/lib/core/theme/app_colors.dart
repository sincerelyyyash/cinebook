import 'package:flutter/material.dart';

/// The single source of truth for colour. A premium **monochrome** system:
/// layered near-blacks and refined greys with a soft platinum "accent" used
/// sparingly for primary actions and active states — no loud colour. Seat
/// categories and semantic states carry the only (muted) hues, because the
/// booking map must stay colour-coded. Re-skinning is a one-file change.
class AppColors {
  const AppColors._();

  // ── Canvas & surfaces (layered greys on black) ─────────────────────────────
  static const Color background = Color(0xFF09090B);
  static const Color surface = Color(0xFF121215);
  static const Color surfaceHigh = Color(0xFF18181C);
  static const Color surfaceHigher = Color(0xFF212127);
  static const Color overlay = Color(0xE60A0A0C);

  // ── Accent = soft platinum (the only "bright" surface) ─────────────────────
  static const Color primary = Color(0xFFEDEDEF);
  static const Color primaryBright = Color(0xFFFFFFFF);
  static const Color primaryDim = Color(0xFF212127);
  static const Color onPrimary = Color(0xFF0A0A0C);

  // ── Text ───────────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFFF3F3F5);
  static const Color textSecondary = Color(0xFF9B9BA3);
  static const Color textTertiary = Color(0xFF5E5E66);

  // ── Semantic (kept muted to preserve the monochrome feel) ──────────────────
  static const Color success = Color(0xFF6FCF97);
  static const Color warning = Color(0xFFE0B15C);
  static const Color error = Color(0xFFE5646C);
  static const Color info = Color(0xFF7FA0C4);

  // ── Lines ──────────────────────────────────────────────────────────────────
  static const Color border = Color(0xFF232329);
  static const Color borderStrong = Color(0xFF303038);

  // ── Seat categories (muted, still distinguishable) ─────────────────────────
  static const Color seatFrontRow = Color(0xFF6FB7AE);
  static const Color seatStandard = Color(0xFF8296C4);
  static const Color seatPremium = Color(0xFFA98FC0);
  static const Color seatRecliner = Color(0xFFCBA76B);

  // ── Gradients ──────────────────────────────────────────────────────────────
  /// Light platinum fill for the primary CTA — subtle top-down sheen.
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFFCFCFD), Color(0xFFE4E4E8)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  /// Very subtle card sheen for elevated surfaces.
  static const LinearGradient surfaceSheen = LinearGradient(
    colors: [Color(0xFF1B1B20), Color(0xFF141417)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Poster scrim so overlaid text stays legible over any artwork.
  static const LinearGradient posterScrim = LinearGradient(
    colors: [Colors.transparent, Color(0xF209090B)],
    stops: [0.3, 1.0],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
