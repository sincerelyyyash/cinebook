import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_dimens.dart';
import 'press_scale.dart';

enum AppButtonVariant { primary, secondary, ghost }

/// The one button in the app. Gradient-filled primary (the reference CTA look),
/// tonal secondary, and a quiet ghost — all with press-scale + haptic feedback
/// and an inline loading state that never resizes the button.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.variant = AppButtonVariant.primary,
    this.loading = false,
    this.expand = true,
    this.height = 54,
  });

  const AppButton.secondary({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.loading = false,
    this.expand = true,
    this.height = 54,
  }) : variant = AppButtonVariant.secondary;

  const AppButton.ghost({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.loading = false,
    this.expand = true,
    this.height = 48,
  }) : variant = AppButtonVariant.ghost;

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final AppButtonVariant variant;
  final bool loading;
  final bool expand;
  final double height;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;

    final Color fg = switch (variant) {
      AppButtonVariant.primary => AppColors.onPrimary,
      AppButtonVariant.secondary => AppColors.textPrimary,
      AppButtonVariant.ghost => AppColors.primary,
    };

    final content = AnimatedOpacity(
      duration: AppMotion.fast,
      opacity: disabled && !loading ? 0.5 : 1,
      child: loading
          ? SizedBox(
              height: 22,
              width: 22,
              child: CircularProgressIndicator(strokeWidth: 2.4, color: fg),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[Icon(icon, size: 20, color: fg), const SizedBox(width: 8)],
                Flexible(
                  child: Text(
                    label,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context)
                        .textTheme
                        .labelLarge
                        ?.copyWith(color: fg, fontSize: 16),
                  ),
                ),
              ],
            ),
    );

    final decoration = switch (variant) {
      AppButtonVariant.primary => BoxDecoration(
          gradient: disabled ? null : AppColors.primaryGradient,
          color: disabled ? AppColors.surfaceHigher : null,
          borderRadius: BorderRadius.circular(AppRadius.md),
          boxShadow: disabled
              ? null
              : [
                  BoxShadow(
                    color: Colors.white.withValues(alpha: 0.10),
                    blurRadius: 22,
                    offset: const Offset(0, 6),
                  ),
                ],
        ),
      AppButtonVariant.secondary => BoxDecoration(
          color: AppColors.surfaceHigher,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      AppButtonVariant.ghost => BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
    };

    final button = PressScale(
      onTap: disabled ? null : onPressed,
      child: AnimatedContainer(
        duration: AppMotion.base,
        curve: AppMotion.emphasized,
        height: height,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        decoration: decoration,
        child: content,
      ),
    );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}
