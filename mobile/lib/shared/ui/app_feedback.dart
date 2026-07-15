import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_dimens.dart';
import '../../core/ui/haptics.dart';

/// Themed toast helpers with a leading status icon + matching haptic. Use these
/// instead of raw [SnackBar]s so feedback stays consistent.
enum _Tone { neutral, success, error }

void showAppSnack(BuildContext context, String message, {IconData? icon}) =>
    _show(context, message, _Tone.neutral, icon ?? PhosphorIconsRegular.info);

void showSuccessSnack(BuildContext context, String message) {
  Haptics.success();
  _show(context, message, _Tone.success, PhosphorIconsFill.checkCircle);
}

void showErrorSnack(BuildContext context, String message) {
  Haptics.error();
  _show(context, message, _Tone.error, PhosphorIconsFill.warningCircle);
}

void _show(BuildContext context, String message, _Tone tone, IconData icon) {
  final color = switch (tone) {
    _Tone.neutral => AppColors.textSecondary,
    _Tone.success => AppColors.success,
    _Tone.error => AppColors.error,
  };
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      duration: const Duration(seconds: 3),
      content: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(message)),
        ],
      ),
    ),
  );
}
