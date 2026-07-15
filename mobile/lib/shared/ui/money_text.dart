import 'package:flutter/material.dart';

import '../../core/theme/app_typography.dart';
import '../../core/utils/money.dart';

/// Renders a paise amount in the tabular **mono** face, so prices align and read
/// as data. Pass a text-theme role via [style] to control size/weight.
class MoneyText extends StatelessWidget {
  const MoneyText(this.paise, {super.key, this.style, this.compact = false, this.color});

  final int paise;
  final TextStyle? style;
  final bool compact;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final base = (style ?? Theme.of(context).textTheme.titleMedium)?.copyWith(color: color);
    return Text(
      compact ? Money.formatCompact(paise) : Money.format(paise),
      style: AppFonts.mono(base),
    );
  }
}

/// Renders a technical code/ID (booking code, transaction ref) in mono.
class CodeText extends StatelessWidget {
  const CodeText(this.text, {super.key, this.style, this.color, this.letterSpacing});

  final String text;
  final TextStyle? style;
  final Color? color;
  final double? letterSpacing;

  @override
  Widget build(BuildContext context) {
    final base = (style ?? Theme.of(context).textTheme.titleMedium)
        ?.copyWith(color: color, letterSpacing: letterSpacing);
    return Text(text, style: AppFonts.mono(base));
  }
}
