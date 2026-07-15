import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../shared/ui/press_scale.dart';
import '../application/chat_controller.dart';
import 'conversations_screen.dart';
import 'widgets/message_bubble.dart';

/// The AI assistant. Streams replies with a smooth char-by-char reveal, renders
/// finalized replies as markdown, surfaces live tool activity + the booking
/// sub-agent as a status orb + chips, and resumes prior conversations.
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _inputCtrl = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: AppMotion.base, curve: AppMotion.emphasized);
      }
    });
  }

  Future<void> _send([String? preset]) async {
    final text = preset ?? _inputCtrl.text;
    if (text.trim().isEmpty) return;
    _inputCtrl.clear();
    _scrollToBottom();
    await ref.read(chatControllerProvider.notifier).send(text);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatControllerProvider);

    ref.listen(chatControllerProvider.select((s) => s.messages.length), (_, __) => _scrollToBottom());
    ref.listen(
      chatControllerProvider.select((s) => s.messages.isEmpty ? 0 : s.messages.last.text.length),
      (_, __) => _scrollToBottom(),
    );

    return Scaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screen,
        title: Row(
          children: [
            Container(
              height: 34,
              width: 34,
              decoration: BoxDecoration(
                gradient: AppColors.surfaceSheen,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(PhosphorIconsFill.sparkle, size: 18, color: AppColors.textPrimary),
            ),
            const SizedBox(width: AppSpacing.sm),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Assistant', style: Theme.of(context).textTheme.titleMedium),
                Text('Find & book by chatting',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.textTertiary)),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'History',
            icon: const Icon(PhosphorIconsRegular.clockCounterClockwise),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ConversationsScreen()),
            ),
          ),
          IconButton(
            tooltip: 'New chat',
            icon: const Icon(PhosphorIconsRegular.notePencil),
            onPressed: () => ref.read(chatControllerProvider.notifier).startNewConversation(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: state.messages.isEmpty
                ? _EmptyChat(onPick: _send)
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.xs),
                    itemCount: state.messages.length,
                    itemBuilder: (context, i) => Align(
                      alignment: state.messages[i].isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: MessageBubble(message: state.messages[i]),
                    ),
                  ),
          ),
          _InputBar(
            controller: _inputCtrl,
            sending: state.sending,
            onSend: _send,
            onStop: () => ref.read(chatControllerProvider.notifier).stop(),
          ),
        ],
      ),
    );
  }
}

String _greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

class _EmptyChat extends StatelessWidget {
  const _EmptyChat({required this.onPick});
  final void Function(String) onPick;

  static const _suggestions = [
    'What sci-fi movies are playing this weekend?',
    'Book 2 recliner seats for an evening show',
    "What's trending right now?",
    'Any offers on bookings today?',
  ];

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(AppSpacing.screen, AppSpacing.xxl, AppSpacing.screen, AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 56,
            width: 56,
            decoration: BoxDecoration(
              gradient: AppColors.surfaceSheen,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(PhosphorIconsFill.sparkle, size: 28, color: AppColors.textPrimary),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(begin: 1, end: 1.05, duration: 1400.ms, curve: Curves.easeInOut),
          const SizedBox(height: AppSpacing.lg),
          Text(_greeting(), style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary))
              .animate()
              .fadeIn(duration: 400.ms),
          const SizedBox(height: 2),
          Text('What would you like to watch?', style: textTheme.headlineSmall)
              .animate()
              .fadeIn(delay: 120.ms, duration: 400.ms)
              .slideY(begin: 0.2, end: 0),
          const SizedBox(height: AppSpacing.xl),
          Text('TRY ASKING',
              style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary, letterSpacing: 1.5)),
          const SizedBox(height: AppSpacing.sm),
          for (var i = 0; i < _suggestions.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: PressScale(
                onTap: () => onPick(_suggestions[i]),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: Text(_suggestions[i], style: textTheme.bodyMedium)),
                      const Icon(PhosphorIconsRegular.arrowUpRight, size: 16, color: AppColors.textTertiary),
                    ],
                  ),
                ),
              ).animate().fadeIn(delay: (150 + 80 * i).ms).slideY(begin: 0.2, end: 0),
            ),
        ],
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  const _InputBar({
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.onStop,
  });

  final TextEditingController controller;
  final bool sending;
  final void Function() onSend;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => sending ? null : onSend(),
                  decoration: const InputDecoration(
                    hintText: 'Message the assistant…',
                    fillColor: AppColors.surfaceHigh,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              PressScale(
                onTap: sending ? onStop : onSend,
                child: Container(
                  height: 48,
                  width: 48,
                  decoration: BoxDecoration(
                    gradient: sending ? null : AppColors.primaryGradient,
                    color: sending ? AppColors.surfaceHigher : null,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Icon(
                    sending ? PhosphorIconsFill.stop : PhosphorIconsFill.paperPlaneTilt,
                    color: sending ? AppColors.textPrimary : AppColors.onPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
