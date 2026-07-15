import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/utils/date_x.dart';
import '../../../shared/ui/money_text.dart';
import '../../../shared/ui/error_state.dart';
import '../../../shared/ui/network_image.dart';
import '../../../shared/ui/pills.dart';
import '../../../shared/ui/press_scale.dart';
import '../../../shared/ui/skeleton.dart';
import '../../booking/domain/booking_models.dart';
import '../application/bookings_controller.dart';

/// "My bookings" — past & upcoming, as ticket-style cards.
class BookingsScreen extends ConsumerWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookings = ref.watch(bookingsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My bookings'),
        titleTextStyle: Theme.of(context).textTheme.headlineSmall,
        toolbarHeight: 64,
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.surfaceHigh,
        onRefresh: () async => ref.invalidate(bookingsListProvider),
        child: bookings.when(
          loading: () => ListView(
            padding: const EdgeInsets.all(AppSpacing.screen),
            children: List.generate(
              4,
              (_) => const Padding(
                padding: EdgeInsets.only(bottom: AppSpacing.md),
                child: Skeleton(height: 96, radius: AppRadius.lg),
              ),
            ),
          ),
          error: (_, __) => ErrorState(
            message: 'Could not load your bookings.',
            onRetry: () => ref.invalidate(bookingsListProvider),
          ),
          data: (list) {
            if (list.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 100),
                  EmptyStateView(
                    icon: PhosphorIconsRegular.ticket,
                    message: 'No bookings yet.\nYour tickets will show up here.',
                  ),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.screen),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, i) => _BookingCard(booking: list[i])
                  .animate()
                  .fadeIn(duration: 300.ms, delay: (50 * i).ms)
                  .slideY(begin: 0.06, end: 0),
            );
          },
        ),
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking});
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return PressScale(
      onTap: () => context.push('/bookings/${booking.id}'),
      scale: 0.98,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 56,
              height: 76,
              child: AppNetworkImage(
                url: null,
                fallbackText: booking.show.movieTitle,
                radius: AppRadius.md,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(booking.show.movieTitle,
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: textTheme.titleSmall),
                  const SizedBox(height: 2),
                  Text(booking.show.theatreName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.labelSmall?.copyWith(color: AppColors.textSecondary)),
                  Text(DateFmt.full(booking.show.startsAt),
                      style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary)),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      bookingStatusBadge(booking.status),
                      const Spacer(),
                      MoneyText(booking.total, style: textTheme.titleSmall),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shared status badge factory used by list + detail.
StatusBadge bookingStatusBadge(BookingStatus status) {
  final (label, color) = switch (status) {
    BookingStatus.confirmed => ('Confirmed', AppColors.success),
    BookingStatus.pending => ('Pending', AppColors.warning),
    BookingStatus.cancelled => ('Cancelled', AppColors.textTertiary),
    BookingStatus.expired => ('Expired', AppColors.textTertiary),
    BookingStatus.refunded => ('Refunded', AppColors.info),
  };
  return StatusBadge(label: label, color: color);
}
