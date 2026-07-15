import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../domain/chat_models.dart';

/// Live tool-activity chip under a streaming assistant turn — makes the agent's
/// action-chaining visible, including the booking sub-agent (`delegate_booking`).
class ToolChip extends StatelessWidget {
  const ToolChip({super.key, required this.step});

  final ToolStep step;

  @override
  Widget build(BuildContext context) {
    final isDelegate = step.tool == 'delegate_booking';
    final Widget leading;
    if (step.running) {
      leading = const SizedBox(
        width: 11, height: 11, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textSecondary));
    } else {
      leading = Icon(
        step.ok ? PhosphorIconsBold.check : PhosphorIconsBold.x,
        size: 13,
        color: step.ok ? AppColors.success : AppColors.error,
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDelegate ? AppColors.surfaceHigher : AppColors.surfaceHigh,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isDelegate) ...[
            const Icon(PhosphorIconsRegular.robot, size: 12, color: AppColors.textSecondary),
            const SizedBox(width: 5),
          ],
          leading,
          const SizedBox(width: 6),
          Text(toolLabel(step.tool),
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

/// Humanize a tool name for display (`check_seat_availability` → "Check seat
/// availability"; `delegate_booking` → "Booking assistant"). Shared by the tool
/// chip and the live thinking status.
String toolLabel(String tool) {
  if (tool == 'delegate_booking') return 'Booking assistant';
  final words = tool.split('_');
  if (words.isEmpty) return tool;
  return words
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');
}
