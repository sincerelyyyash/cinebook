import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';

import '../../../../core/domain/enums.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/ui/haptics.dart';
import '../../domain/booking_models.dart';

/// Seat category colours (muted, still distinguishable) for the color-coded map.
Color seatCategoryColor(SeatCategory category) => switch (category) {
      SeatCategory.frontRow => AppColors.seatFrontRow,
      SeatCategory.standard => AppColors.seatStandard,
      SeatCategory.premium => AppColors.seatPremium,
      SeatCategory.recliner => AppColors.seatRecliner,
    };

/// Color-coded, scrollable seat map with a curved screen indicator. Available
/// seats animate on select (scale + fill), booked/held are disabled.
class SeatGrid extends StatelessWidget {
  const SeatGrid({
    super.key,
    required this.seats,
    required this.selected,
    required this.onTap,
  });

  final List<SeatAvailability> seats;
  final Set<String> selected;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    final byRow = groupBy(seats, (SeatAvailability s) => s.row);
    final rows = byRow.keys.sorted((a, b) => a.compareTo(b));

    return Column(
      children: [
        const _ScreenIndicator(),
        const SizedBox(height: AppSpacing.lg),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Column(
            children: [
              for (final row in rows)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 18,
                        child: Text(row,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: AppColors.textTertiary)),
                      ),
                      for (final seat in byRow[row]!.sorted((a, b) => a.number.compareTo(b.number)))
                        _SeatBox(
                          seat: seat,
                          selected: selected.contains(seat.id),
                          onTap: () {
                            Haptics.selection();
                            onTap(seat.id);
                          },
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ScreenIndicator extends StatelessWidget {
  const _ScreenIndicator();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CustomPaint(
          size: const Size(220, 26),
          painter: _ScreenCurvePainter(),
        ),
        const SizedBox(height: 4),
        Text('SCREEN',
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(color: AppColors.textTertiary, letterSpacing: 4)),
      ],
    );
  }
}

class _ScreenCurvePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.borderStrong
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    final path = Path()
      ..moveTo(0, size.height)
      ..quadraticBezierTo(size.width / 2, -size.height, size.width, size.height);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _SeatBox extends StatelessWidget {
  const _SeatBox({required this.seat, required this.selected, required this.onTap});

  final SeatAvailability seat;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final booked = seat.status == SeatStatus.booked;
    final heldByOther = seat.status == SeatStatus.held && !seat.heldByMe;
    final disabled = booked || heldByOther;
    final category = seatCategoryColor(seat.category);

    late final Color bg;
    late final Color fg;
    late final Border? border;
    if (selected) {
      bg = AppColors.primary;
      fg = AppColors.onPrimary;
      border = null;
    } else if (booked) {
      bg = AppColors.background;
      fg = AppColors.textTertiary.withValues(alpha: 0.4);
      border = Border.all(color: AppColors.border);
    } else if (heldByOther) {
      bg = AppColors.surfaceHigh;
      fg = AppColors.textTertiary;
      border = Border.all(color: AppColors.border);
    } else {
      bg = AppColors.surfaceHigh;
      fg = AppColors.textSecondary;
      border = Border.all(color: category.withValues(alpha: 0.55), width: 1.2);
    }

    return Padding(
      padding: const EdgeInsets.all(2.5),
      child: GestureDetector(
        onTap: disabled ? null : onTap,
        child: AnimatedScale(
          scale: selected ? 1.12 : 1.0,
          duration: AppMotion.fast,
          curve: AppMotion.spring,
          child: AnimatedContainer(
            duration: AppMotion.fast,
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(8),
                bottom: Radius.circular(4),
              ),
              border: border,
              boxShadow: selected
                  ? [BoxShadow(color: Colors.white.withValues(alpha: 0.25), blurRadius: 10)]
                  : null,
            ),
            child: booked
                ? Icon(PhosphorIconsBold.x, size: 13, color: fg)
                : Text('${seat.number}', style: TextStyle(fontSize: 10, color: fg, fontWeight: FontWeight.w600)),
          ),
        ),
      ),
    );
  }
}

/// Legend mapping colours to seat categories.
class SeatLegend extends StatelessWidget {
  const SeatLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.textSecondary);
    return Wrap(
      spacing: AppSpacing.md,
      runSpacing: AppSpacing.xs,
      children: [
        for (final category in seatCategoryOrder)
          _LegendDot(color: seatCategoryColor(category), label: category.label, style: style),
        _LegendDot(color: AppColors.primary, label: 'Selected', style: style, filled: true),
        _LegendDot(color: AppColors.textTertiary, label: 'Taken', style: style, cross: true),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({
    required this.color,
    required this.label,
    required this.style,
    this.filled = false,
    this.cross = false,
  });

  final Color color;
  final String label;
  final TextStyle? style;
  final bool filled;
  final bool cross;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: filled ? color : (cross ? AppColors.background : AppColors.surfaceHigh),
            borderRadius: BorderRadius.circular(4),
            border: filled ? null : Border.all(color: color.withValues(alpha: cross ? 0.4 : 0.7), width: 1.2),
          ),
          child: cross ? Icon(PhosphorIconsBold.x, size: 9, color: color.withValues(alpha: 0.5)) : null,
        ),
        const SizedBox(width: 5),
        Text(label, style: style),
      ],
    );
  }
}
