import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/ui/haptics.dart';
import '../../../core/utils/money.dart';
import '../../../shared/ui/app_button.dart';
import '../../../shared/ui/money_text.dart';
import '../application/checkout_controller.dart';
import '../domain/booking_models.dart';
import 'payment_sheet.dart';
import 'widgets/hold_timer.dart';

/// Booking journey steps 4–5: review held seats, apply a promo, pay, confirm.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key, required this.hold});

  final Hold hold;

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _promoCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(checkoutControllerProvider.notifier).start(widget.hold);
    });
  }

  @override
  void dispose() {
    _promoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkoutControllerProvider);
    final controller = ref.read(checkoutControllerProvider.notifier);

    if (state == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (state.stage == CheckoutStage.confirmed && state.booking != null) {
      return _ConfirmationView(booking: state.booking!);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.md),
            child: Center(
              child: HoldTimer(expiresAt: state.expiresAt, onExpired: controller.onExpired),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screen),
        children: [
          _TicketCard(hold: state.hold),
          const SizedBox(height: AppSpacing.lg),
          Text('Have a promo code?',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: AppSpacing.sm),
          _PromoField(
            controller: _promoCtrl,
            state: state,
            onApply: () => controller.previewPromo(_promoCtrl.text),
            onClear: () {
              _promoCtrl.clear();
              controller.clearPromo();
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          _PriceBreakdown(state: state),
          if (state.error != null) ...[
            const SizedBox(height: AppSpacing.md),
            _ErrorLine(message: state.error!),
          ],
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: AppButton(
              label: state.stage == CheckoutStage.review
                  ? 'Proceed to pay · ${Money.format(state.total)}'
                  : 'Enter card details',
              icon: PhosphorIconsRegular.lock,
              loading: state.busy,
              onPressed: () async {
                if (state.stage == CheckoutStage.review) {
                  final ok = await controller.proceedToPayment();
                  if (ok && context.mounted) PaymentSheet.show(context);
                } else {
                  PaymentSheet.show(context);
                }
              },
            ),
          ),
        ),
      ),
    );
  }
}

/// Ticket-style summary with side notches and a dashed divider.
class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.hold});
  final Hold hold;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.surfaceSheen,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Container(
                  height: 42,
                  width: 42,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceHigher,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: const Icon(PhosphorIconsRegular.armchair, size: 20),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${hold.seats.length} seat${hold.seats.length == 1 ? '' : 's'} held',
                          style: textTheme.titleSmall),
                      Text('Complete payment before the timer runs out',
                          style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const _DashedDivider(),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                for (final s in hold.seats)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        Icon(PhosphorIconsRegular.armchair, size: 16, color: AppColors.textTertiary),
                        const SizedBox(width: 8),
                        Expanded(child: Text('${s.label} · ${s.category.label}', style: textTheme.bodyMedium)),
                        MoneyText(s.price, style: textTheme.bodyMedium),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DashedDivider extends StatelessWidget {
  const _DashedDivider();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = (constraints.maxWidth / 10).floor();
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(
              count,
              (_) => Container(width: 5, height: 1, color: AppColors.borderStrong),
            ),
          ),
        );
      },
    );
  }
}

class _PromoField extends StatelessWidget {
  const _PromoField({
    required this.controller,
    required this.state,
    required this.onApply,
    required this.onClear,
  });

  final TextEditingController controller;
  final CheckoutState state;
  final VoidCallback onApply;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final applied = state.promoPreview;
    if (applied != null) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.success.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            const Icon(PhosphorIconsFill.checkCircle, color: AppColors.success, size: 20),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${applied.code} applied', style: Theme.of(context).textTheme.titleSmall),
                  Text('You saved ${Money.format(applied.discount)}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
            TextButton(onPressed: onClear, child: const Text('Remove')),
          ],
        ),
      ).animate().fadeIn().slideX(begin: -0.05, end: 0);
    }
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              hintText: 'Enter code',
              prefixIcon: const Icon(PhosphorIconsRegular.tag, size: 18),
              errorText: state.promoError,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        SizedBox(
          height: 52,
          child: AppButton.secondary(label: 'Apply', expand: false, onPressed: state.busy ? null : onApply),
        ),
      ],
    );
  }
}

class _PriceBreakdown extends StatelessWidget {
  const _PriceBreakdown({required this.state});
  final CheckoutState state;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    Widget row(String label, String value, {bool emphasize = false, Color? color}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label,
                  style: (emphasize ? textTheme.titleMedium : textTheme.bodyMedium)
                      ?.copyWith(color: color ?? (emphasize ? AppColors.textPrimary : AppColors.textSecondary))),
              Text(value,
                  style: AppFonts.mono(
                      (emphasize ? textTheme.titleMedium : textTheme.bodyMedium)?.copyWith(color: color))),
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
          row('Subtotal', Money.format(state.subtotal)),
          if (state.discount > 0) row('Discount', '- ${Money.format(state.discount)}', color: AppColors.success),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: Divider(),
          ),
          row('Total', Money.format(state.total), emphasize: true),
        ],
      ),
    );
  }
}

class _ErrorLine extends StatelessWidget {
  const _ErrorLine({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(PhosphorIconsRegular.warningCircle, size: 18, color: AppColors.error),
        const SizedBox(width: 8),
        Expanded(
          child: Text(message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.error)),
        ),
      ],
    );
  }
}

/// Celebratory confirmation with an animated check + ticket code.
class _ConfirmationView extends StatefulWidget {
  const _ConfirmationView({required this.booking});
  final Booking booking;

  @override
  State<_ConfirmationView> createState() => _ConfirmationViewState();
}

class _ConfirmationViewState extends State<_ConfirmationView> {
  @override
  void initState() {
    super.initState();
    Haptics.success();
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.booking;
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                height: 96,
                width: 96,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.14),
                  shape: BoxShape.circle,
                ),
                child: const Icon(PhosphorIconsBold.check, size: 52, color: AppColors.success),
              )
                  .animate()
                  .scale(begin: const Offset(0.4, 0.4), end: const Offset(1, 1), duration: 500.ms, curve: Curves.elasticOut)
                  .fadeIn(),
              const SizedBox(height: AppSpacing.lg),
              Text('Booking confirmed', style: textTheme.headlineSmall)
                  .animate()
                  .fadeIn(delay: 200.ms)
                  .slideY(begin: 0.2, end: 0),
              const SizedBox(height: AppSpacing.xs),
              Text('Enjoy the show!',
                  style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
              const SizedBox(height: AppSpacing.xl),
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  gradient: AppColors.surfaceSheen,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Text('BOOKING ID',
                        style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary, letterSpacing: 2)),
                    const SizedBox(height: 4),
                    CodeText(b.code, style: textTheme.titleLarge?.copyWith(fontSize: 22), letterSpacing: 2),
                    const SizedBox(height: AppSpacing.md),
                    Text('${b.show.movieTitle} · ${b.show.screenName}',
                        textAlign: TextAlign.center, style: textTheme.titleSmall),
                    Text(b.seats.map((s) => s.label).join(', '),
                        textAlign: TextAlign.center,
                        style: textTheme.bodySmall?.copyWith(color: AppColors.textSecondary)),
                    const SizedBox(height: AppSpacing.sm),
                    MoneyText(b.total, style: textTheme.titleLarge),
                  ],
                ),
              ).animate().fadeIn(delay: 350.ms).slideY(begin: 0.1, end: 0),
              const Spacer(),
              AppButton(
                label: 'View my bookings',
                onPressed: () {
                  // Pop back to the shell; bookings tab shows the new booking.
                  Navigator.of(context).popUntil((r) => r.isFirst);
                },
              ),
              const SizedBox(height: AppSpacing.sm),
              AppButton.ghost(
                label: 'Done',
                onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
