import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_typography.dart';

/// Renders a chat message's text with a smooth **char-by-char reveal** during
/// streaming, then swaps to themed **markdown** once the reply is finalized.
///
/// - Reveals ~90 chars/sec regardless of network chunk size, so the text flows
///   in smoothly instead of jumping in 24-char bursts.
/// - Keeps revealing even after streaming ends — finishes the animation
///   naturally — then renders the full text as markdown (assistant only).
/// - Messages that were never streamed (loaded from history) show instantly.
/// - User messages stay plain text (short, and markdown on a filled pill reads
///   worse); assistant messages get full markdown (lists, bold, headings…).
class MessageText extends StatefulWidget {
  const MessageText({
    super.key,
    required this.text,
    required this.streaming,
    required this.isUser,
    required this.baseStyle,
  });

  final String text;
  final bool streaming;
  final bool isUser;
  final TextStyle baseStyle;

  @override
  State<MessageText> createState() => _MessageTextState();
}

class _MessageTextState extends State<MessageText> {
  static const _tickMs = 40;
  static const _charsPerTick = 4;

  Timer? _timer;
  late int _revealed;
  late bool _everStreamed;

  @override
  void initState() {
    super.initState();
    _everStreamed = widget.streaming;
    _revealed = widget.streaming ? 0 : widget.text.length;
    if (widget.streaming) _startTimer();
  }

  void _startTimer() {
    _timer ??= Timer.periodic(const Duration(milliseconds: _tickMs), (_) {
      if (!mounted) return;
      final target = widget.text.length;
      if (_revealed >= target) {
        // Caught up. If the stream has ended, we're done — stop ticking.
        if (!widget.streaming) {
          _timer?.cancel();
          _timer = null;
        }
        return;
      }
      setState(() => _revealed = (_revealed + _charsPerTick).clamp(0, target));
    });
  }

  @override
  void didUpdateWidget(MessageText old) {
    super.didUpdateWidget(old);
    if (widget.streaming) _everStreamed = true;
    // A live turn keeps its timer; a history turn (never streamed) shows in full.
    if (_everStreamed && _timer == null && _revealed < widget.text.length) {
      _startTimer();
    }
    if (!_everStreamed) _revealed = widget.text.length;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final revealing = _revealed < widget.text.length;
    final shown = revealing ? widget.text.substring(0, _revealed) : widget.text;

    // Plain text for user turns, and for assistant turns still animating.
    if (widget.isUser || revealing || widget.streaming) {
      return Text(shown, style: widget.baseStyle);
    }
    // Finalized assistant turn → full markdown.
    return MarkdownBody(
      data: widget.text,
      selectable: true,
      softLineBreak: true,
      styleSheet: _sheet(context, widget.baseStyle),
    );
  }
}

MarkdownStyleSheet _sheet(BuildContext context, TextStyle base) {
  final t = Theme.of(context).textTheme;
  final mono = AppFonts.mono(base.copyWith(fontSize: 13, color: AppColors.textPrimary));
  return MarkdownStyleSheet(
    p: base,
    a: base.copyWith(color: AppColors.primary, decoration: TextDecoration.underline),
    strong: base.copyWith(fontWeight: FontWeight.w700),
    em: base.copyWith(fontStyle: FontStyle.italic),
    h1: t.titleLarge,
    h2: t.titleMedium,
    h3: t.titleSmall,
    listBullet: base.copyWith(color: AppColors.textSecondary),
    code: mono,
    codeblockPadding: const EdgeInsets.all(AppSpacing.sm),
    codeblockDecoration: BoxDecoration(
      color: AppColors.background,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      border: Border.all(color: AppColors.border),
    ),
    blockquote: base.copyWith(color: AppColors.textSecondary),
    blockquoteDecoration: BoxDecoration(
      color: AppColors.surfaceHigh,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      border: const Border(left: BorderSide(color: AppColors.borderStrong, width: 3)),
    ),
    blockquotePadding: const EdgeInsets.all(AppSpacing.sm),
    horizontalRuleDecoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: AppColors.border)),
    ),
    tableBorder: TableBorder.all(color: AppColors.border),
    tableHead: base.copyWith(fontWeight: FontWeight.w700),
    tableBody: base.copyWith(fontSize: 13),
    listBulletPadding: const EdgeInsets.only(right: 6),
    pPadding: const EdgeInsets.only(bottom: 2),
  );
}
