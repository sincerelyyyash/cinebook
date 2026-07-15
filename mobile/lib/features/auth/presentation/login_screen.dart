import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/ui/app_button.dart';
import '../application/login_controller.dart';

/// Two-step passwordless login: phone → OTP. Premium monochrome look with a
/// soft animated entrance and an inline dev-code hint.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneCtrl = TextEditingController(text: '+91');
  final _otpCtrl = TextEditingController();

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(loginControllerProvider);
    final controller = ref.read(loginControllerProvider.notifier);
    final textTheme = Theme.of(context).textTheme;

    ref.listen(loginControllerProvider.select((s) => s.devCode), (_, code) {
      if (code != null) _otpCtrl.text = code;
    });

    final isOtp = state.phase == LoginPhase.enterOtp;

    return Scaffold(
      body: Stack(
        children: [
          // Subtle top glow for depth.
          Positioned(
            top: -120,
            left: -60,
            right: -60,
            child: Container(
              height: 300,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [Colors.white.withValues(alpha: 0.05), Colors.transparent],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Brand(textTheme: textTheme),
                      const SizedBox(height: AppSpacing.xxxl),
                      AnimatedSwitcher(
                        duration: AppMotion.base,
                        transitionBuilder: (child, anim) => FadeTransition(
                          opacity: anim,
                          child: SlideTransition(
                            position: Tween(begin: const Offset(0.06, 0), end: Offset.zero)
                                .animate(anim),
                            child: child,
                          ),
                        ),
                        child: isOtp
                            ? _OtpStep(
                                key: const ValueKey('otp'),
                                controller: controller,
                                state: state,
                                otpCtrl: _otpCtrl)
                            : _PhoneStep(
                                key: const ValueKey('phone'),
                                controller: controller,
                                state: state,
                                phoneCtrl: _phoneCtrl),
                      ),
                      AnimatedSize(
                        duration: AppMotion.base,
                        curve: AppMotion.emphasized,
                        child: state.error != null
                            ? Padding(
                                padding: const EdgeInsets.only(top: AppSpacing.md),
                                child: _ErrorLine(message: state.error!),
                              )
                            : const SizedBox(width: double.infinity),
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(duration: AppMotion.slow).slideY(begin: 0.04, end: 0),
            ),
          ),
        ],
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand({required this.textTheme});
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: 64,
          width: 64,
          decoration: BoxDecoration(
            gradient: AppColors.surfaceSheen,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: const Icon(PhosphorIconsFill.filmSlate, size: 32, color: AppColors.textPrimary),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text('CineBook', textAlign: TextAlign.center, style: textTheme.displaySmall),
        const SizedBox(height: AppSpacing.xs),
        Text('Movies, seats & offers, booked in seconds.',
            textAlign: TextAlign.center,
            style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
      ],
    );
  }
}

class _PhoneStep extends StatelessWidget {
  const _PhoneStep({super.key, required this.controller, required this.state, required this.phoneCtrl});

  final LoginController controller;
  final LoginState state;
  final TextEditingController phoneCtrl;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Sign in', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: phoneCtrl,
          keyboardType: TextInputType.phone,
          style: Theme.of(context).textTheme.titleMedium,
          decoration: const InputDecoration(
            labelText: 'Phone number',
            hintText: '+919000000003',
            prefixIcon: Icon(PhosphorIconsRegular.deviceMobile),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        AppButton(
          label: 'Send code',
          icon: PhosphorIconsRegular.arrowRight,
          loading: state.submitting,
          onPressed: () => controller.requestOtp(phoneCtrl.text.trim()),
        ),
      ],
    );
  }
}

class _OtpStep extends StatelessWidget {
  const _OtpStep({super.key, required this.controller, required this.state, required this.otpCtrl});

  final LoginController controller;
  final LoginState state;
  final TextEditingController otpCtrl;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Verify', style: textTheme.titleLarge),
        const SizedBox(height: AppSpacing.xs),
        Text('Enter the 6-digit code sent to ${state.phone}',
            style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
        if (state.devCode != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceHigh,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(PhosphorIconsFill.lightning, size: 16, color: AppColors.warning),
                const SizedBox(width: 6),
                Text('Dev code ${state.devCode}',
                    style: textTheme.labelSmall?.copyWith(color: AppColors.textSecondary)),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: otpCtrl,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          style: AppFonts.mono(textTheme.titleLarge?.copyWith(fontSize: 24, letterSpacing: 10)),
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(counterText: '', hintText: '••••••'),
        ),
        const SizedBox(height: AppSpacing.md),
        AppButton(
          label: 'Verify & continue',
          loading: state.submitting,
          onPressed: () => controller.verifyOtp(otpCtrl.text.trim()),
        ),
        const SizedBox(height: AppSpacing.xs),
        AppButton.ghost(
          label: 'Change number',
          onPressed: state.submitting ? null : controller.backToPhone,
        ),
      ],
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
    ).animate().shakeX(hz: 4, amount: 2);
  }
}
