import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../booking/data/booking_repository.dart';
import '../../booking/domain/booking_models.dart';

/// Booking history list (`GET /bookings`). First page only; the seed dataset is
/// small, and detail is fetched on demand.
final bookingsListProvider = FutureProvider.autoDispose<List<Booking>>((ref) async {
  final page = await ref.watch(bookingRepositoryProvider).listBookings(pageSize: 50);
  return page.items;
});

final bookingDetailProvider =
    FutureProvider.autoDispose.family<Booking, String>((ref, id) {
  return ref.watch(bookingRepositoryProvider).getBooking(id);
});

/// Mutations (cancel / refund) that refresh the list + detail on completion.
class BookingActions {
  BookingActions(this._ref);
  final Ref _ref;

  BookingRepository get _repo => _ref.read(bookingRepositoryProvider);

  Future<Booking> cancel(String bookingId) async {
    final booking = await _repo.cancelBooking(bookingId);
    _invalidate(bookingId);
    return booking;
  }

  Future<Booking> refund(String bookingId) async {
    final result = await _repo.refundPayment(bookingId);
    _invalidate(bookingId);
    return result.booking;
  }

  void _invalidate(String bookingId) {
    _ref.invalidate(bookingsListProvider);
    _ref.invalidate(bookingDetailProvider(bookingId));
  }
}

final bookingActionsProvider = Provider<BookingActions>((ref) => BookingActions(ref));
