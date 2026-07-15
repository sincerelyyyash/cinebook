import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/paginated.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/booking_models.dart';

/// Authenticated booking flow: availability → hold → booking → promo →
/// payment. Holds/bookings/payments are **not** retried automatically (they
/// mutate money/seat state); only the availability read is safe to retry.
class BookingRepository {
  BookingRepository(this._client);

  final ApiClient _client;

  /* ── Availability ─────────────────────────────────────────────────────────── */

  Future<ShowAvailability> getAvailability(String showId, {String? holdId}) {
    return _client.get<ShowAvailability>(
      '/shows/$showId/seats',
      query: holdId != null ? {'holdId': holdId} : null,
      decode: (d) => ShowAvailability.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  /* ── Holds ────────────────────────────────────────────────────────────────── */

  /// All-or-nothing 5-minute hold. Throws `SEAT_UNAVAILABLE` if any seat was
  /// taken first.
  Future<Hold> holdSeats(String showId, List<String> seatIds) {
    return _client.post<Hold>(
      '/bookings/holds',
      body: {'showId': showId, 'seatIds': seatIds},
      decode: (d) => Hold.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<void> releaseHold(String holdId) {
    return _client.delete<void>('/bookings/holds/$holdId', decode: (_) {});
  }

  /* ── Bookings ─────────────────────────────────────────────────────────────── */

  /// Convert a hold into a PENDING booking (optionally applying a promo).
  /// Throws `HOLD_EXPIRED` if the 5-minute window elapsed.
  Future<Booking> createBooking(String holdId, {String? promoCode}) {
    return _client.post<Booking>(
      '/bookings',
      body: {'holdId': holdId, if (promoCode != null && promoCode.isNotEmpty) 'promoCode': promoCode},
      decode: (d) => Booking.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<Booking> getBooking(String bookingId) {
    return _client.get<Booking>(
      '/bookings/$bookingId',
      decode: (d) => Booking.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<Booking> cancelBooking(String bookingId) {
    return _client.post<Booking>(
      '/bookings/$bookingId/cancel',
      decode: (d) => Booking.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<Paginated<Booking>> listBookings({int page = 1, int pageSize = 20}) {
    return _client.get<Paginated<Booking>>(
      '/bookings',
      query: {'page': page, 'pageSize': pageSize},
      decode: (d) => Paginated.fromJson((d as Map).cast<String, dynamic>(), Booking.fromJson),
    );
  }

  /* ── Promos ───────────────────────────────────────────────────────────────── */

  /// Preview a code against an amount (paise) — no mutation.
  Future<PromoPreview> previewPromo(String code, int amount) {
    return _client.post<PromoPreview>(
      '/promos/apply',
      body: {'code': code, 'amount': amount},
      decode: (d) => PromoPreview.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  /// Apply a promo to a PENDING booking, recomputing its total.
  Future<Booking> applyPromo(String bookingId, String code) {
    return _client.post<Booking>(
      '/bookings/$bookingId/promo',
      body: {'code': code},
      decode: (d) => Booking.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<List<PromoSummary>> listPromos() {
    return _client.get<List<PromoSummary>>(
      '/promos',
      decode: (d) => (d as List)
          .map((e) => PromoSummary.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }

  /* ── Payments (simulated) ─────────────────────────────────────────────────── */

  Future<Payment> startPayment(String bookingId) {
    return _client.post<Payment>(
      '/payments/$bookingId/start',
      decode: (d) => Payment.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  /// Confirm with a test card. On success the booking becomes CONFIRMED.
  /// Throws `PAYMENT_FAILED` (declined) or `PAYMENT_UNAVAILABLE` (circuit open).
  Future<PaymentResult> confirmPayment(String bookingId, String cardNumber) {
    return _client.post<PaymentResult>(
      '/payments/$bookingId/confirm',
      body: {'cardNumber': cardNumber},
      decode: (d) => PaymentResult.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<PaymentResult> refundPayment(String bookingId) {
    return _client.post<PaymentResult>(
      '/payments/$bookingId/refund',
      decode: (d) => PaymentResult.fromJson((d as Map).cast<String, dynamic>()),
    );
  }
}

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  return BookingRepository(ref.watch(apiClientProvider));
});
