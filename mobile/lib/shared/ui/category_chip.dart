import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_dimens.dart';
import 'press_scale.dart';

/// Pill filter chip with an animated selected state (the "All / Action /
/// Adventure" row from the reference). Selecting fires a selection haptic.
class CategoryChip extends StatelessWidget {
  const CategoryChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return PressScale.selection(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppMotion.base,
        curve: AppMotion.emphasized,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? null : AppColors.surfaceHigh,
          gradient: selected ? AppColors.primaryGradient : null,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(
            color: selected ? Colors.transparent : AppColors.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 15, color: selected ? AppColors.onPrimary : AppColors.textSecondary),
              const SizedBox(width: 6),
            ],
            AnimatedDefaultTextStyle(
              duration: AppMotion.base,
              style: Theme.of(context).textTheme.labelLarge!.copyWith(
                    color: selected ? AppColors.onPrimary : AppColors.textSecondary,
                  ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}
