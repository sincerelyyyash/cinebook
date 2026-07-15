import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/utils/date_x.dart';
import '../../../core/utils/money.dart';
import '../../../shared/ui/category_chip.dart';
import '../../../shared/ui/error_state.dart';
import '../../../shared/ui/press_scale.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../application/showtimes_controller.dart';
import '../domain/show.dart';

/// Booking journey step 2: choose a show. Theatre cards → date → showtime pills.
class ShowtimesScreen extends ConsumerStatefulWidget {
  const ShowtimesScreen({super.key, required this.movieId});

  final String movieId;

  @override
  ConsumerState<ShowtimesScreen> createState() => _ShowtimesScreenState();
}

class _ShowtimesScreenState extends ConsumerState<ShowtimesScreen> {
  ScreenType? _screenType;

  @override
  Widget build(BuildContext context) {
    final query = ShowtimesQuery(movieId: widget.movieId, screenType: _screenType?.wire);
    final showtimes = ref.watch(showtimesProvider(query));

    return Scaffold(
      appBar: AppBar(title: const Text('Showtimes')),
      body: Column(
        children: [
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screen, vertical: AppSpacing.xs),
              children: [
                CategoryChip(
                  label: 'All formats',
                  selected: _screenType == null,
                  onTap: () => setState(() => _screenType = null),
                ),
                const SizedBox(width: AppSpacing.xs),
                for (final t in ScreenType.values) ...[
                  CategoryChip(
                    label: t.label,
                    selected: _screenType == t,
                    onTap: () => setState(() => _screenType = _screenType == t ? null : t),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                ],
              ],
            ),
          ),
          Expanded(
            child: AsyncValueView<ShowtimesResponse>(
              value: showtimes,
              onRetry: () => ref.invalidate(showtimesProvider(query)),
              data: (data) {
                if (data.theatres.isEmpty) {
                  return const EmptyStateView(
                    message: 'No shows scheduled for this movie yet.',
                    icon: PhosphorIconsRegular.calendarX,
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.screen),
                  itemCount: data.theatres.length,
                  separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                  itemBuilder: (context, i) => _TheatreCard(group: data.theatres[i])
                      .animate()
                      .fadeIn(duration: 300.ms, delay: (60 * i).ms)
                      .slideY(begin: 0.08, end: 0),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TheatreCard extends StatelessWidget {
  const _TheatreCard({required this.group});
  final ShowtimeTheatreGroup group;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 40,
                width: 40,
                decoration: BoxDecoration(
                  color: AppColors.surfaceHigher,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: const Icon(PhosphorIconsRegular.buildings, size: 20),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(group.theatreName, style: textTheme.titleSmall),
                    Text('${group.chain} · ${group.city}',
                        style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          for (final dateGroup in group.dates) _DateRow(dateGroup: dateGroup),
        ],
      ),
    );
  }
}

class _DateRow extends StatelessWidget {
  const _DateRow({required this.dateGroup});
  final ShowtimeDateGroup dateGroup;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(DateFmt.dayMonth('${dateGroup.date}T00:00:00'),
              style: textTheme.labelMedium?.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: [
              for (final show in dateGroup.shows)
                _ShowPill(show: show, onTap: () => context.push('/shows/${show.showId}/seats')),
            ],
          ),
        ],
      ),
    );
  }
}

class _ShowPill extends StatelessWidget {
  const _ShowPill({required this.show, required this.onTap});
  final ShowtimeShow show;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return PressScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surfaceHigh,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(DateFmt.time(show.startsAt), style: textTheme.titleSmall),
            const SizedBox(height: 1),
            Text('${show.screenType.label} · ${show.format.label} · ${Money.formatCompact(show.basePrice)}',
                style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}
