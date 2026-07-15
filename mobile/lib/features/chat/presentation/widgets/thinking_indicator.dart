import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';

/// A calm pulsing orb + live status label shown while the assistant is working
/// before any text arrives. The label reflects what the agent is actually doing
/// (mapped from the current tool), so "Thinking…" becomes "Searching movies…",
/// "Checking seats…", "Booking assistant…" as the turn progresses.
class ThinkingIndicator extends StatefulWidget {
  const ThinkingIndicator({super.key, required this.label});

  final String label;

  @override
  State<ThinkingIndicator> createState() => _ThinkingIndicatorState();
}

class _ThinkingIndicatorState extends State<ThinkingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: AppSpacing.xs),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 34,
            height: 34,
            child: AnimatedBuilder(
              animation: _c,
              builder: (_, __) => CustomPaint(painter: _OrbPainter(_c.value)),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          AnimatedSwitcher(
            duration: AppMotion.base,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SizeTransition(axis: Axis.horizontal, sizeFactor: anim, child: child),
            ),
            child: Text(
              widget.label,
              key: ValueKey(widget.label),
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

/// Concentric rings rippling outward + a soft pulsing core — monochrome.
class _OrbPainter extends CustomPainter {
  _OrbPainter(this.t);
  final double t; // 0..1

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final maxR = size.width / 2;

    // Two ripple rings, phase-offset, fading as they expand.
    for (var i = 0; i < 2; i++) {
      final p = ((t + i * 0.5) % 1.0);
      final r = maxR * (0.35 + p * 0.65);
      final opacity = (1 - p) * 0.5;
      canvas.drawCircle(
        center,
        r,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.2
          ..color = AppColors.textSecondary.withValues(alpha: opacity),
      );
    }

    // Pulsing core.
    final pulse = (math.sin(t * math.pi * 2) + 1) / 2; // 0..1
    final coreR = maxR * (0.26 + pulse * 0.12);
    canvas.drawCircle(
      center,
      coreR + 3,
      Paint()..color = Colors.white.withValues(alpha: 0.06 + pulse * 0.10),
    );
    canvas.drawCircle(
      center,
      coreR,
      Paint()..color = AppColors.textPrimary.withValues(alpha: 0.55 + pulse * 0.35),
    );
  }

  @override
  bool shouldRepaint(covariant _OrbPainter old) => old.t != t;
}
