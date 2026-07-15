import 'package:flutter/material.dart';

import '../../core/theme/app_dimens.dart';
import '../../core/ui/haptics.dart';

/// Wraps any tappable in a subtle press-down scale + optional haptic — the
/// micro-interaction that makes the whole UI feel physical. Prefer this over a
/// bare [GestureDetector]/[InkWell] for cards, buttons and list rows.
class PressScale extends StatefulWidget {
  const PressScale({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = 0.96,
    this.haptic = _HapticKind.light,
    this.enabled = true,
  });

  /// Fire a selection haptic instead of a light impact (for toggles/seats).
  const PressScale.selection({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = 0.94,
    this.enabled = true,
  }) : haptic = _HapticKind.selection;

  /// No haptic (for large surfaces where it would be noisy).
  const PressScale.silent({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = 0.98,
    this.enabled = true,
  }) : haptic = _HapticKind.none;

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scale;
  final _HapticKind haptic;
  final bool enabled;

  @override
  State<PressScale> createState() => _PressScaleState();
}

enum _HapticKind { none, selection, light }

class _PressScaleState extends State<PressScale> {
  bool _down = false;

  bool get _active => widget.enabled && (widget.onTap != null || widget.onLongPress != null);

  void _setDown(bool v) {
    if (_active && _down != v) setState(() => _down = v);
  }

  void _handleTap() {
    switch (widget.haptic) {
      case _HapticKind.selection:
        Haptics.selection();
      case _HapticKind.light:
        Haptics.light();
      case _HapticKind.none:
        break;
    }
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _setDown(true),
      onTapUp: (_) => _setDown(false),
      onTapCancel: () => _setDown(false),
      onTap: _active ? _handleTap : null,
      onLongPress: _active && widget.onLongPress != null
          ? () {
              Haptics.medium();
              widget.onLongPress!.call();
            }
          : null,
      child: AnimatedScale(
        scale: _down ? widget.scale : 1.0,
        duration: AppMotion.fast,
        curve: AppMotion.emphasized,
        child: widget.child,
      ),
    );
  }
}
