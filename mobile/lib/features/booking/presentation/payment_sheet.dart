import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/ui/haptics.dart';
import '../../../shared/ui/app_button.dart';
import '../../../shared/ui/press_scale.dart';
import '../application/checkout_controller.dart';
import '../domain/test_cards.dart';

/// Simulated card-payment sheet. Test cards cover the success / decline /
/// random / gateway-error paths. Closes itself once the booking is CONFIRMED.
class PaymentSheet extends ConsumerStatefulWidget {
  const PaymentSheet({super.key});

  static Future<void> show(BuildContext context) => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (_) => const PaymentSheet(),
      );

  @override
  ConsumerState<PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends ConsumerState<PaymentSheet> {
  final _cardCtrl = TextEditingController();

  @override
  void dispose() {
    _cardCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkoutControllerProvider);
    final controller = ref.read(checkoutControllerProvider.notifier);
    final textTheme = Theme.of(context).textTheme;

    ref.listen(checkoutControllerProvider, (_, next) {
      if (next?.stage == CheckoutStage.confirmed && context.mounted) {
        Navigator.of(context).pop();
      } else if (next?.error != null && next?.error != state?.error) {
        Haptics.error();
      }
    });

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.screen,
        right: AppSpacing.screen,
        top: AppSpacing.xs,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Payment', style: textTheme.titleLarge),
          const SizedBox(height: 2),
          Text('Simulated gateway. Pick a test card, no real charge.',
              style: textTheme.bodySmall?.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: AppSpacing.lg),
          TextField(
            controller: _cardCtrl,
            keyboardType: TextInputType.number,
            style: textTheme.titleMedium?.copyWith(letterSpacing: 1.5),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9 ]')),
              _CardNumberFormatter(),
            ],
            decoration: const InputDecoration(
              labelText: 'Card number',
              hintText: '4111 1111 1111 1111',
              prefixIcon: Icon(PhosphorIconsRegular.creditCard),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text('Test cards',
              style: textTheme.labelMedium?.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: AppSpacing.xs),
          for (final card in kTestCards)
            _TestCardTile(
              card: card,
              selected: _cardCtrl.text.replaceAll(' ', '') == card.number.replaceAll(' ', ''),
              onTap: () => setState(() => _cardCtrl.text = card.number),
            ),
          if (state?.error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                const Icon(PhosphorIconsRegular.warningCircle, size: 18, color: AppColors.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(state!.error!,
                      style: textTheme.bodySmall?.copyWith(color: AppColors.error)),
                ),
              ],
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          AppButton(
            label: 'Pay now',
            icon: PhosphorIconsRegular.lock,
            loading: state?.busy ?? false,
            onPressed: () => controller.pay(_cardCtrl.text.replaceAll(' ', '')),
          ),
        ],
      ),
    );
  }
}

class _TestCardTile extends StatelessWidget {
  const _TestCardTile({required this.card, required this.selected, required this.onTap});

  final TestCard card;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (card.kind) {
      TestCardKind.success => (PhosphorIconsFill.checkCircle, AppColors.success),
      TestCardKind.fail => (PhosphorIconsRegular.prohibit, AppColors.error),
      TestCardKind.random => (PhosphorIconsRegular.diceFive, AppColors.warning),
      TestCardKind.error => (PhosphorIconsRegular.cloudSlash, AppColors.textTertiary),
    };
    return PressScale.selection(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.xs),
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.surfaceHigh,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: selected ? AppColors.borderStrong : AppColors.border),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(card.label, style: Theme.of(context).textTheme.titleSmall),
                  Text(card.number,
                      style: Theme.of(context)
                          .textTheme
                          .labelSmall
                          ?.copyWith(color: AppColors.textTertiary)),
                ],
              ),
            ),
            AnimatedOpacity(
              opacity: selected ? 1 : 0,
              duration: AppMotion.fast,
              child: const Icon(PhosphorIconsFill.checkCircle, size: 20, color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final formatted = formatCardNumber(newValue.text);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
