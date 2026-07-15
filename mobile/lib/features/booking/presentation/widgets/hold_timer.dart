import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/date_x.dart';

/// Live countdown pill to an ISO expiry (the 5-minute hold / pending window).
/// Turns urgent (error tint) under a minute and fires [onExpired] once.
class HoldTimer extends StatefulWidget {
  const HoldTimer({super.key, required this.expiresAt, this.onExpired});

  final String expiresAt;
  final VoidCallback? onExpired;

  @override
  State<HoldTimer> createState() => _HoldTimerState();
}

class _HoldTimerState extends State<HoldTimer> {
  Timer? _timer;
  late DateTime _deadline;
  bool _fired = false;

  @override
  void initState() {
    super.initState();
    _deadline = DateTime.parse(widget.expiresAt);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void didUpdateWidget(HoldTimer old) {
    super.didUpdateWidget(old);
    if (old.expiresAt != widget.expiresAt) {
      _deadline = DateTime.parse(widget.expiresAt);
      _fired = false;
    }
  }

  void _tick() {
    if (!mounted) return;
    final remaining = _deadline.difference(DateTime.now());
    if (remaining.isNegative && !_fired) {
      _fired = true;
      widget.onExpired?.call();
    }
    setState(() {});
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final remaining = _deadline.difference(DateTime.now());
    final expired = remaining.isNegative;
    final urgent = remaining.inSeconds <= 60;
    final color = expired || urgent ? AppColors.error : AppColors.textPrimary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: (expired || urgent) ? AppColors.error.withValues(alpha: 0.12) : AppColors.surfaceHigher,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(PhosphorIconsRegular.timer, size: 15, color: color),
          const SizedBox(width: 5),
          Text(
            expired ? 'Expired' : DateFmt.countdown(remaining),
            style: AppFonts.mono(TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
