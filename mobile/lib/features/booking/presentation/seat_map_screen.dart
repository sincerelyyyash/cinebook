import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/utils/date_x.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/utils/money.dart';
import '../../../shared/ui/app_button.dart';
import '../../../shared/ui/app_feedback.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../application/seat_map_controller.dart';
import 'widgets/seat_grid.dart';

/// Booking journey step 3: pick seats on a live, color-coded map, then hold.
class SeatMapScreen extends ConsumerWidget {
  const SeatMapScreen({super.key, required this.showId});

  final String showId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateAsync = ref.watch(seatMapControllerProvider(showId));
    final controller = ref.read(seatMapControllerProvider(showId).notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Select seats')),
      body: AsyncValueView<SeatMapState>(
        value: stateAsync,
        onRetry: () => ref.invalidate(seatMapControllerProvider(showId)),
        data: (state) {
          final a = state.availability;
          return Column(
            children: [
              _Header(
                movieTitle: a.movieTitle,
                subtitle: '${a.theatreName} · ${a.screenName}',
                when: DateFmt.full(a.startsAt),
                connected: state.socketConnected,
                available: a.summary.available,
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md, AppSpacing.xl, AppSpacing.md, AppSpacing.md),
                  child: SeatGrid(
                    seats: a.seats,
                    selected: state.selected,
                    onTap: controller.toggleSeat,
                  ),
                ),
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: const SeatLegend(),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: stateAsync.maybeWhen(
        data: (state) => _SelectionBar(
          state: state,
          onHold: () => _hold(context, ref),
        ),
        orElse: () => null,
      ),
    );
  }

  Future<void> _hold(BuildContext context, WidgetRef ref) async {
    final controller = ref.read(seatMapControllerProvider(showId).notifier);
    try {
      final hold = await controller.placeHold();
      if (hold == null || !context.mounted) return;
      context.push('/checkout', extra: hold);
    } on ApiException catch (e) {
      if (!context.mounted) return;
      showErrorSnack(
        context,
        e.isSeatUnavailable ? 'Some seats were just taken. Please pick again.' : e.message,
      );
    }
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.movieTitle,
    required this.subtitle,
    required this.when,
    required this.connected,
    required this.available,
  });

  final String movieTitle;
  final String subtitle;
  final String when;
  final bool connected;
  final int available;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(AppSpacing.screen, AppSpacing.sm, AppSpacing.screen, AppSpacing.md),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(movieTitle, style: textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(subtitle, style: textTheme.labelSmall?.copyWith(color: AppColors.textSecondary)),
                Text(when, style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _LiveBadge(connected: connected),
              const SizedBox(height: 4),
              Text('$available open',
                  style: textTheme.labelSmall?.copyWith(color: AppColors.textSecondary)),
            ],
          ),
        ],
      ),
    );
  }
}

class _LiveBadge extends StatelessWidget {
  const _LiveBadge({required this.connected});
  final bool connected;

  @override
  Widget build(BuildContext context) {
    final color = connected ? AppColors.success : AppColors.textTertiary;
    final dot = Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle));
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        connected
            ? dot.animate(onPlay: (c) => c.repeat(reverse: true)).fadeIn().then().fadeOut(duration: 900.ms)
            : dot,
        const SizedBox(width: 5),
        Text(connected ? 'Live' : 'Reconnecting',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color)),
      ],
    );
  }
}

class _SelectionBar extends StatelessWidget {
  const _SelectionBar({required this.state, required this.onHold});

  final SeatMapState state;
  final VoidCallback onHold;

  @override
  Widget build(BuildContext context) {
    final count = state.selected.length;
    final labels = state.selectedSeats.map((s) => '${s.row}${s.number}').toList()..sort();
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      count == 0 ? 'Select seats' : '$count seat${count == 1 ? '' : 's'} · ${labels.join(', ')}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.labelMedium?.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 2),
                    Text(count == 0 ? '-' : Money.format(state.selectedSubtotal),
                        style: AppFonts.mono(textTheme.titleLarge)),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              SizedBox(
                width: 150,
                child: AppButton(
                  label: 'Hold seats',
                  loading: state.placingHold,
                  onPressed: count == 0 ? null : onHold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
