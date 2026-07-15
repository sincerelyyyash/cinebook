import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/utils/date_x.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/utils/money.dart';
import '../../../shared/ui/money_text.dart';
import '../../../shared/ui/app_button.dart';
import '../../../shared/ui/app_feedback.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../../booking/domain/booking_models.dart';
import '../application/bookings_controller.dart';
import 'bookings_screen.dart';

/// Booking detail with a barcode-style header and cancel / refund actions.
class BookingDetailScreen extends ConsumerWidget {
  const BookingDetailScreen({super.key, required this.bookingId});

  final String bookingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingDetailProvider(bookingId));

    return Scaffold(
      appBar: AppBar(title: const Text('Ticket')),
      body: AsyncValueView<Booking>(
        value: booking,
        onRetry: () => ref.invalidate(bookingDetailProvider(bookingId)),
        data: (b) => ListView(
          padding: const EdgeInsets.all(AppSpacing.screen),
          children: [
            _TicketHeader(booking: b),
            const SizedBox(height: AppSpacing.lg),
            _DetailRows(booking: b),
            const SizedBox(height: AppSpacing.lg),
            _PriceCard(booking: b),
            const SizedBox(height: AppSpacing.xl),
            _Actions(booking: b),
          ],
        ),
      ),
    );
  }
}

class _TicketHeader extends StatelessWidget {
  const _TicketHeader({required this.booking});
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: AppColors.surfaceSheen,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(booking.show.movieTitle, style: textTheme.titleLarge),
                    const SizedBox(height: 2),
                    Text('${booking.show.theatreName} · ${booking.show.screenName}',
                        style: textTheme.labelSmall?.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
              bookingStatusBadge(booking.status),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          // Faux barcode (decorative).
          SizedBox(
            height: 56,
            child: Row(
              children: List.generate(60, (i) {
                final w = (i % 3 == 0) ? 3.0 : (i % 2 == 0 ? 1.5 : 2.0);
                return Container(
                  width: w,
                  margin: const EdgeInsets.symmetric(horizontal: 1),
                  color: i % 5 == 0 ? Colors.transparent : AppColors.textPrimary,
                );
              }),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          CodeText(booking.code,
              style: textTheme.titleMedium, color: AppColors.textPrimary, letterSpacing: 3),
        ],
      ),
    );
  }
}

class _DetailRows extends StatelessWidget {
  const _DetailRows({required this.booking});
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          _row(context, PhosphorIconsRegular.calendarBlank, 'When', DateFmt.full(booking.show.startsAt)),
          _row(context, PhosphorIconsFill.filmStrip, 'Format', booking.show.format.label),
          _row(context, PhosphorIconsRegular.armchair, 'Seats',
              booking.seats.map((s) => s.label).join(', ')),
          _row(context, PhosphorIconsRegular.squaresFour, 'Category',
              booking.seats.map((s) => s.category.label).toSet().join(', ')),
          if (booking.payment != null)
            _row(context, PhosphorIconsRegular.receipt, 'Txn', booking.payment!.transactionId, last: true),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, IconData icon, String label, String value, {bool last = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: last ? 0 : AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textTertiary),
          const SizedBox(width: AppSpacing.sm),
          Text(label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textTertiary)),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(value,
                textAlign: TextAlign.right, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}

class _PriceCard extends StatelessWidget {
  const _PriceCard({required this.booking});
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    Widget row(String l, String v, {bool bold = false, Color? color}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l, style: (bold ? textTheme.titleMedium : textTheme.bodyMedium)
                  ?.copyWith(color: color ?? (bold ? null : AppColors.textSecondary))),
              Text(v, style: AppFonts.mono((bold ? textTheme.titleMedium : textTheme.bodyMedium)?.copyWith(color: color))),
            ],
          ),
        );
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          row('Subtotal', Money.format(booking.subtotal)),
          if (booking.discount > 0)
            row('Discount${booking.promoCode != null ? ' (${booking.promoCode})' : ''}',
                '- ${Money.format(booking.discount)}', color: AppColors.success),
          const Divider(height: 16),
          row('Total paid', Money.format(booking.total), bold: true),
        ],
      ),
    );
  }
}

class _Actions extends ConsumerStatefulWidget {
  const _Actions({required this.booking});
  final Booking booking;

  @override
  ConsumerState<_Actions> createState() => _ActionsState();
}

class _ActionsState extends ConsumerState<_Actions> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final b = widget.booking;
    final canCancel = b.status == BookingStatus.pending || b.status == BookingStatus.confirmed;
    final canRefund = b.status == BookingStatus.confirmed && b.payment != null;

    if (!canCancel && !canRefund) return const SizedBox.shrink();

    return Column(
      children: [
        if (canRefund)
          AppButton.secondary(
            label: 'Request refund',
            icon: PhosphorIconsRegular.currencyInr,
            loading: _busy,
            onPressed: () => _run(() => ref.read(bookingActionsProvider).refund(b.id), 'Refund processed'),
          ),
        if (canCancel) ...[
          const SizedBox(height: AppSpacing.sm),
          AppButton.ghost(
            label: 'Cancel booking',
            onPressed: _busy ? null : () => _confirmCancel(b.id),
          ),
        ],
      ],
    );
  }

  Future<void> _confirmCancel(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel booking?'),
        content: const Text('This releases your seats and cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel booking', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _run(() => ref.read(bookingActionsProvider).cancel(id), 'Booking cancelled');
    }
  }

  Future<void> _run(Future<void> Function() action, String successMsg) async {
    setState(() => _busy = true);
    try {
      await action();
      if (mounted) showSuccessSnack(context, successMsg);
    } on ApiException catch (e) {
      if (mounted) showErrorSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
