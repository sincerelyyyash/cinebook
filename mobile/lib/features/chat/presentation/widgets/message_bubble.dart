import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../domain/chat_models.dart';
import 'message_text.dart';
import 'thinking_indicator.dart';
import 'tool_chip.dart';

/// One transcript row. Assistant = surface card with a 1px line, soft shadow and
/// a small top-left notch; user = platinum pill with a bottom-right notch. While
/// an assistant turn is still working with no text yet, a live [ThinkingIndicator]
/// stands in for the empty bubble.
class MessageBubble extends StatelessWidget {
  const MessageBubble({super.key, required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;

    // Assistant working, nothing to show yet → live status orb.
    if (!isUser && message.streaming && message.text.isEmpty) {
      final active = message.activeTool;
      final label = active != null ? '${toolLabel(active.tool)}…' : 'Thinking…';
      return Align(
        alignment: Alignment.centerLeft,
        child: ThinkingIndicator(label: label),
      );
    }

    final scheme = Theme.of(context).textTheme;
    final textStyle = scheme.bodyMedium!.copyWith(
      color: isUser ? AppColors.onPrimary : AppColors.textPrimary,
      height: 1.4,
    );

    final bubble = Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
      decoration: BoxDecoration(
        color: isUser ? null : AppColors.surface,
        gradient: isUser ? AppColors.primaryGradient : null,
        border: isUser ? null : Border.all(color: AppColors.border),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(isUser ? AppRadius.lg : AppRadius.xs),
          topRight: const Radius.circular(AppRadius.lg),
          bottomLeft: const Radius.circular(AppRadius.lg),
          bottomRight: Radius.circular(isUser ? AppRadius.xs : AppRadius.lg),
        ),
        boxShadow: isUser
            ? null
            : [BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 14, offset: const Offset(0, 6))],
      ),
      child: MessageText(
        text: message.text,
        streaming: message.streaming,
        isUser: isUser,
        baseStyle: textStyle,
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          // Completed tool trail above an assistant reply.
          if (!isUser && message.tools.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 6, left: 2),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [for (final t in message.tools) ToolChip(step: t)],
              ),
            ),
          bubble,
          if (message.at != null && !message.streaming)
            Padding(
              padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
              child: Text(
                DateFormat('h:mm a').format(message.at!),
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(color: AppColors.textTertiary, fontSize: 10),
              ),
            ),
        ],
      ),
    ).animate().fadeIn(duration: 220.ms).slideY(begin: 0.08, end: 0);
  }
}
