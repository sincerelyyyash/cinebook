import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../data/auth_repository.dart';
import 'session_controller.dart';

enum LoginPhase { enterPhone, enterOtp }

class LoginState {
  const LoginState({
    this.phase = LoginPhase.enterPhone,
    this.phone = '',
    this.devCode,
    this.submitting = false,
    this.error,
    this.retryAfterSec,
  });

  final LoginPhase phase;
  final String phone;

  /// Dev-only OTP echoed by the backend so testers can log in without SMS.
  final String? devCode;
  final bool submitting;
  final String? error;
  final int? retryAfterSec;

  LoginState copyWith({
    LoginPhase? phase,
    String? phone,
    String? devCode,
    bool? submitting,
    String? error,
    int? retryAfterSec,
    bool clearError = false,
    bool clearDevCode = false,
  }) {
    return LoginState(
      phase: phase ?? this.phase,
      phone: phone ?? this.phone,
      devCode: clearDevCode ? null : (devCode ?? this.devCode),
      submitting: submitting ?? this.submitting,
      error: clearError ? null : (error ?? this.error),
      retryAfterSec: retryAfterSec ?? this.retryAfterSec,
    );
  }
}

/// Drives the two-step OTP login form. On successful verification it promotes
/// the user into the global session via [SessionController.setAuthenticated].
class LoginController extends AutoDisposeNotifier<LoginState> {
  @override
  LoginState build() => const LoginState();

  AuthRepository get _repo => ref.read(authRepositoryProvider);

  Future<bool> requestOtp(String phone) async {
    state = state.copyWith(submitting: true, clearError: true, phone: phone);
    try {
      final res = await _repo.requestOtp(phone);
      state = state.copyWith(
        submitting: false,
        phase: LoginPhase.enterOtp,
        devCode: res.devCode,
        clearDevCode: res.devCode == null,
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        submitting: false,
        error: e.isRateLimited
            ? 'Too many requests. Try again in ${e.retryAfterSec ?? 60}s.'
            : e.message,
        retryAfterSec: e.retryAfterSec,
      );
      return false;
    }
  }

  Future<bool> verifyOtp(String code) async {
    state = state.copyWith(submitting: true, clearError: true);
    try {
      final user = await _repo.verifyOtp(state.phone, code);
      ref.read(sessionControllerProvider.notifier).setAuthenticated(user);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(submitting: false, error: e.message);
      return false;
    }
  }

  void backToPhone() {
    state = state.copyWith(phase: LoginPhase.enterPhone, clearError: true);
  }
}

final loginControllerProvider =
    AutoDisposeNotifierProvider<LoginController, LoginState>(LoginController.new);
