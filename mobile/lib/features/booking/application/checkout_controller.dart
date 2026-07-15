import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../data/booking_repository.dart';
import '../domain/booking_models.dart';

enum CheckoutStage {
  /// Hold placed; reviewing seats + optional promo before booking.
  review,

  /// A PENDING booking exists; collecting payment.
  payment,

  /// Payment succeeded, booking CONFIRMED.
  confirmed,
}

class CheckoutState {
  const CheckoutState({
    required this.hold,
    this.stage = CheckoutStage.review,
    this.promoPreview,
    this.promoError,
    this.booking,
    this.payment,
    this.busy = false,
    this.error,
  });

  final Hold hold;
  final CheckoutStage stage;
  final PromoPreview? promoPreview;
  final String? promoError;

  /// Set once the hold is converted into a PENDING booking.
  final Booking? booking;
  final Payment? payment;
  final bool busy;
  final String? error;

  /// Countdown target: the booking's expiry once created, else the hold's.
  String get expiresAt => booking?.expiresAt ?? hold.expiresAt;

  int get subtotal => booking?.subtotal ?? hold.subtotal;
  int get discount => booking?.discount ?? promoPreview?.discount ?? 0;
  int get total => booking?.total ?? (subtotal - discount);

  CheckoutState copyWith({
    Hold? hold,
    CheckoutStage? stage,
    PromoPreview? promoPreview,
    String? promoError,
    Booking? booking,
    Payment? payment,
    bool? busy,
    String? error,
    bool clearPromo = false,
    bool clearPromoError = false,
    bool clearError = false,
  }) =>
      CheckoutState(
        hold: hold ?? this.hold,
        stage: stage ?? this.stage,
        promoPreview: clearPromo ? null : (promoPreview ?? this.promoPreview),
        promoError: clearPromoError ? null : (promoError ?? this.promoError),
        booking: booking ?? this.booking,
        payment: payment ?? this.payment,
        busy: busy ?? this.busy,
        error: clearError ? null : (error ?? this.error),
      );
}

/// Drives checkout after a hold is placed: preview/apply promo → create a
/// PENDING booking → start + confirm the simulated payment. If the user
/// abandons before a booking is created, the hold is released on dispose.
class CheckoutController extends AutoDisposeNotifier<CheckoutState?> {
  @override
  CheckoutState? build() {
    ref.onDispose(_releaseIfAbandoned);
    return null;
  }

  BookingRepository get _repo => ref.read(bookingRepositoryProvider);

  /// Seed with the hold returned by the seat map. Call once from the screen.
  void start(Hold hold) {
    state ??= CheckoutState(hold: hold);
  }

  /* ── Promo ─────────────────────────────────────────────────────────────────── */

  Future<void> previewPromo(String code) async {
    final s = state;
    if (s == null || code.trim().isEmpty) return;
    state = s.copyWith(busy: true, clearPromoError: true);
    try {
      final preview = await _repo.previewPromo(code.trim(), s.subtotal);
      state = state!.copyWith(busy: false, promoPreview: preview, clearPromoError: true);
    } on ApiException catch (e) {
      state = state!.copyWith(busy: false, promoError: e.message, clearPromo: true);
    }
  }

  void clearPromo() {
    final s = state;
    if (s == null) return;
    state = s.copyWith(clearPromo: true, clearPromoError: true);
  }

  /* ── Create booking + start payment ────────────────────────────────────────── */

  /// Convert the hold into a PENDING booking (applying any previewed promo) and
  /// initialize payment. Advances to [CheckoutStage.payment] on success.
  Future<bool> proceedToPayment() async {
    final s = state;
    if (s == null || s.busy) return false;
    state = s.copyWith(busy: true, clearError: true);
    try {
      final booking =
          await _repo.createBooking(s.hold.id, promoCode: s.promoPreview?.code);
      final payment = await _repo.startPayment(booking.id);
      state = state!.copyWith(
        busy: false,
        booking: booking,
        payment: payment,
        stage: CheckoutStage.payment,
      );
      return true;
    } on ApiException catch (e) {
      state = state!.copyWith(busy: false, error: e.message);
      return false;
    }
  }

  /* ── Confirm payment ───────────────────────────────────────────────────────── */

  /// Confirm with a test card. On success the booking is CONFIRMED. Surfaces
  /// `PAYMENT_FAILED` / `PAYMENT_UNAVAILABLE` as [error] for the UI.
  Future<bool> pay(String cardNumber) async {
    final s = state;
    if (s == null || s.booking == null || s.busy) return false;
    state = s.copyWith(busy: true, clearError: true);
    try {
      final result = await _repo.confirmPayment(s.booking!.id, cardNumber);
      state = state!.copyWith(
        busy: false,
        booking: result.booking,
        payment: result.payment,
        stage: CheckoutStage.confirmed,
      );
      return true;
    } on ApiException catch (e) {
      state = state!.copyWith(busy: false, error: e.message);
      return false;
    }
  }

  /// The hold/booking timer elapsed while the user was on this screen.
  void onExpired() {
    final s = state;
    if (s == null || s.stage == CheckoutStage.confirmed) return;
    state = s.copyWith(
      error: 'Your seats were released because the hold expired. Please pick seats again.',
    );
  }

  void _releaseIfAbandoned() {
    final s = state;
    // Only release when no booking was ever created (a PENDING booking
    // expires server-side on its own timer).
    if (s != null && s.booking == null) {
      unawaited(_repo.releaseHold(s.hold.id).catchError((_) {}));
    }
  }
}

final checkoutControllerProvider =
    AutoDisposeNotifierProvider<CheckoutController, CheckoutState?>(CheckoutController.new);
