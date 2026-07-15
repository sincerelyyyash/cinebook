import 'package:flutter/animation.dart';

/// Spacing, radii, and motion scales. Using a fixed scale everywhere is what
/// keeps the layout rhythm consistent and the whitespace intentional.
class AppSpacing {
  const AppSpacing._();
  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 20;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;

  /// Standard screen horizontal padding.
  static const double screen = 20;
}

class AppRadius {
  const AppRadius._();
  static const double xs = 6;
  static const double sm = 10;
  static const double md = 14;
  static const double lg = 20;
  static const double xl = 28;
  static const double pill = 999;
}

/// Durations + curves for a coherent motion language. Short, springy, never
/// sluggish — the District feel.
class AppMotion {
  const AppMotion._();
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration base = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 400);
  static const Duration entrance = Duration(milliseconds: 450);

  static const Curve emphasized = Curves.easeOutCubic;
  static const Curve spring = Curves.easeOutBack;
  static const Curve standard = Curves.easeInOut;
}
