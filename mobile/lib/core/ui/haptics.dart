import 'package:flutter/services.dart';

/// Centralized, semantic haptics so feedback stays consistent app-wide. Thin
/// wrappers over [HapticFeedback] — call these, not the platform API directly.
class Haptics {
  const Haptics._();

  /// Discrete choice: chip toggle, seat tap, tab switch, stepper.
  static void selection() => HapticFeedback.selectionClick();

  /// Light confirmation: button press, card tap.
  static void light() => HapticFeedback.lightImpact();

  /// Medium: sheet open, meaningful state change.
  static void medium() => HapticFeedback.mediumImpact();

  /// Heavy: destructive confirm, hard boundary.
  static void heavy() => HapticFeedback.heavyImpact();

  /// A short celebratory double-tap for success (booking / payment done).
  static Future<void> success() async {
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 90));
    await HapticFeedback.lightImpact();
  }

  /// A firm buzz for errors / declines.
  static Future<void> error() async {
    await HapticFeedback.heavyImpact();
    await Future<void>.delayed(const Duration(milliseconds: 70));
    await HapticFeedback.heavyImpact();
  }
}
