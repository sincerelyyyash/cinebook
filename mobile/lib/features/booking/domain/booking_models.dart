import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/domain/enums.dart';

part 'booking_models.freezed.dart';
part 'booking_models.g.dart';

/* ── Seat availability (GET /shows/:id/seats) ───────────────────────────────── */

@freezed
class SeatAvailability with _$SeatAvailability {
  const factory SeatAvailability({
    required String id,
    required String row,
    required int number,
    required SeatCategory category,
    required int price,
    required SeatStatus status,
    @Default(false) bool heldByMe,
  }) = _SeatAvailability;

  factory SeatAvailability.fromJson(Map<String, dynamic> json) =>
      _$SeatAvailabilityFromJson(json);
}

@freezed
class AvailabilityCounts with _$AvailabilityCounts {
  const factory AvailabilityCounts({
    @Default(0) int total,
    @Default(0) int available,
    @Default(0) int held,
    @Default(0) int booked,
  }) = _AvailabilityCounts;

  factory AvailabilityCounts.fromJson(Map<String, dynamic> json) =>
      _$AvailabilityCountsFromJson(json);
}

@freezed
class ShowAvailability with _$ShowAvailability {
  const factory ShowAvailability({
    required String showId,
    required String movieTitle,
    required String screenName,
    required String theatreName,
    required String startsAt,
    required Format format,
    required Map<String, int> priceByCategory,
    required AvailabilityCounts summary,
    required List<SeatAvailability> seats,
  }) = _ShowAvailability;

  factory ShowAvailability.fromJson(Map<String, dynamic> json) =>
      _$ShowAvailabilityFromJson(json);
}

/* ── Hold (POST /bookings/holds) ────────────────────────────────────────────── */

@freezed
class HoldSeatLine with _$HoldSeatLine {
  const factory HoldSeatLine({
    required String seatId,
    required String label,
    required SeatCategory category,
    required int price,
  }) = _HoldSeatLine;

  factory HoldSeatLine.fromJson(Map<String, dynamic> json) => _$HoldSeatLineFromJson(json);
}

@freezed
class Hold with _$Hold {
  const factory Hold({
    required String id,
    required String showId,
    required List<HoldSeatLine> seats,
    required int subtotal,
    required String expiresAt,
    required int ttlSeconds,
  }) = _Hold;

  factory Hold.fromJson(Map<String, dynamic> json) => _$HoldFromJson(json);
}

/* ── Booking (POST /bookings, /:id/confirm, /:id/cancel) ────────────────────── */

@freezed
class BookingSeatLine with _$BookingSeatLine {
  const factory BookingSeatLine({
    required String seatId,
    required String label,
    required SeatCategory category,
    required int price,
  }) = _BookingSeatLine;

  factory BookingSeatLine.fromJson(Map<String, dynamic> json) =>
      _$BookingSeatLineFromJson(json);
}

@freezed
class BookingShowRef with _$BookingShowRef {
  const factory BookingShowRef({
    required String id,
    required String movieTitle,
    required String screenName,
    required String theatreName,
    required String city,
    required String startsAt,
    required Format format,
  }) = _BookingShowRef;

  factory BookingShowRef.fromJson(Map<String, dynamic> json) =>
      _$BookingShowRefFromJson(json);
}

@freezed
class BookingPaymentRef with _$BookingPaymentRef {
  const factory BookingPaymentRef({
    required String status,
    required String transactionId,
  }) = _BookingPaymentRef;

  factory BookingPaymentRef.fromJson(Map<String, dynamic> json) =>
      _$BookingPaymentRefFromJson(json);
}

@freezed
class Booking with _$Booking {
  const factory Booking({
    required String id,
    required String code,
    required BookingStatus status,
    required BookingShowRef show,
    required List<BookingSeatLine> seats,
    required int subtotal,
    required int discount,
    required int total,
    String? promoCode,
    String? expiresAt,
    required String createdAt,
    BookingPaymentRef? payment,
  }) = _Booking;

  factory Booking.fromJson(Map<String, dynamic> json) => _$BookingFromJson(json);
}

/* ── Payments (simulated) ───────────────────────────────────────────────────── */

@freezed
class Payment with _$Payment {
  const factory Payment({
    required String id,
    required String status,
    required String transactionId,
    required int amount,
    String? cardLast4,
  }) = _Payment;

  factory Payment.fromJson(Map<String, dynamic> json) => _$PaymentFromJson(json);
}

/// confirm/refund return the payment plus the re-fetched booking.
@freezed
class PaymentResult with _$PaymentResult {
  const factory PaymentResult({
    required Payment payment,
    required Booking booking,
  }) = _PaymentResult;

  factory PaymentResult.fromJson(Map<String, dynamic> json) => _$PaymentResultFromJson(json);
}

/* ── Promos ─────────────────────────────────────────────────────────────────── */

@freezed
class PromoPreview with _$PromoPreview {
  const factory PromoPreview({
    required String code,
    required String description,
    required int discount,
  }) = _PromoPreview;

  factory PromoPreview.fromJson(Map<String, dynamic> json) => _$PromoPreviewFromJson(json);
}

@freezed
class PromoSummary with _$PromoSummary {
  const factory PromoSummary({
    required String code,
    required String description,
    int? percentOff,
    int? flatOff,
    int? minAmount,
    required String validFrom,
    required String validTo,
  }) = _PromoSummary;

  factory PromoSummary.fromJson(Map<String, dynamic> json) => _$PromoSummaryFromJson(json);
}
