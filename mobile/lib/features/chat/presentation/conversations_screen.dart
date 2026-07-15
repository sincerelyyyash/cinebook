import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/utils/date_x.dart';
import '../../../shared/ui/error_state.dart';
import '../../../shared/ui/press_scale.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../application/chat_controller.dart';
import '../domain/chat_models.dart';

/// Conversation history. Tapping one resumes it in the chat screen.
class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Chat history')),
      body: AsyncValueView<List<ConversationSummary>>(
        value: conversations,
        onRetry: () => ref.invalidate(conversationsProvider),
        data: (list) {
          if (list.isEmpty) {
            return const EmptyStateView(
                message: 'No conversations yet.', icon: PhosphorIconsRegular.chats);
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.xs),
            itemBuilder: (context, i) {
              final c = list[i];
              return PressScale(
                onTap: () async {
                  await ref.read(chatControllerProvider.notifier).loadConversation(c.id);
                  if (context.mounted) Navigator.of(context).pop();
                },
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(PhosphorIconsRegular.chatCircle, size: 18, color: AppColors.textSecondary),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c.title ?? 'Conversation',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleSmall),
                            Text(DateFmt.dayMonthYear(c.updatedAt),
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(color: AppColors.textTertiary)),
                          ],
                        ),
                      ),
                      const Icon(PhosphorIconsRegular.caretRight, color: AppColors.textTertiary),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
