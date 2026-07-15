import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/realtime/seat_socket.dart';
import '../data/booking_repository.dart';
import '../domain/booking_models.dart';

/// Seat-map state: the live availability snapshot plus the user's pending
/// selection and socket connectivity.
class SeatMapState {
  const SeatMapState({
    required this.availability,
    required this.selected,
    this.socketConnected = false,
    this.placingHold = false,
  });

  final ShowAvailability availability;
  final Set<String> selected;
  final bool socketConnected;
  final bool placingHold;

  int get selectedSubtotal => availability.seats
      .where((s) => selected.contains(s.id))
      .fold(0, (sum, s) => sum + s.price);

  List<SeatAvailability> get selectedSeats =>
      availability.seats.where((s) => selected.contains(s.id)).toList();

  SeatMapState copyWith({
    ShowAvailability? availability,
    Set<String>? selected,
    bool? socketConnected,
    bool? placingHold,
  }) =>
      SeatMapState(
        availability: availability ?? this.availability,
        selected: selected ?? this.selected,
        socketConnected: socketConnected ?? this.socketConnected,
        placingHold: placingHold ?? this.placingHold,
      );
}

/// Loads seat availability, keeps it live over the WebSocket, and manages the
/// customer's seat selection until a hold is placed. Falls back to a periodic
/// poll of `GET /shows/:id/seats` while the socket is down.
class SeatMapController extends AutoDisposeFamilyAsyncNotifier<SeatMapState, String> {
  SeatSocket? _socket;
  StreamSubscription<AvailabilitySnapshot>? _snapSub;
  StreamSubscription<SocketStatus>? _statusSub;
  Timer? _pollTimer;
  bool _socketUp = false;

  BookingRepository get _repo => ref.read(bookingRepositoryProvider);
  String get _showId => arg;

  @override
  Future<SeatMapState> build(String showId) async {
    ref.onDispose(_teardown);

    final availability = await _repo.getAvailability(showId);
    _startSocket();
    _startPollingFallback();

    return SeatMapState(availability: availability, selected: const {});
  }

  /* ── Selection ─────────────────────────────────────────────────────────────── */

  void toggleSeat(String seatId) {
    final current = state.valueOrNull;
    if (current == null) return;

    final seat = current.availability.seats.firstWhere((s) => s.id == seatId);
    // Only free seats (or ones already selected) are selectable.
    if (seat.status != SeatStatus.available && !current.selected.contains(seatId)) {
      return;
    }

    final next = {...current.selected};
    if (next.contains(seatId)) {
      next.remove(seatId);
    } else {
      if (next.length >= kMaxSeatsPerHold) return; // hold cap
      next.add(seatId);
    }
    state = AsyncData(current.copyWith(selected: next));
  }

  void clearSelection() {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.copyWith(selected: const {}));
  }

  /* ── Hold ──────────────────────────────────────────────────────────────────── */

  /// Place an all-or-nothing hold on the current selection. Returns the [Hold]
  /// on success; rethrows [ApiException] (e.g. `SEAT_UNAVAILABLE`) for the UI.
  Future<Hold?> placeHold() async {
    final current = state.valueOrNull;
    if (current == null || current.selected.isEmpty) return null;

    state = AsyncData(current.copyWith(placingHold: true));
    try {
      final hold = await _repo.holdSeats(_showId, current.selected.toList());
      // Ownership of these seats now passes to the checkout flow.
      state = AsyncData(current.copyWith(placingHold: false, selected: const {}));
      return hold;
    } catch (_) {
      state = AsyncData(current.copyWith(placingHold: false));
      // Refresh availability so a lost race reflects immediately.
      await _refreshAvailability();
      rethrow;
    }
  }

  /* ── Live updates ──────────────────────────────────────────────────────────── */

  void _startSocket() {
    final socket = SeatSocket(_showId)..connect();
    _socket = socket;
    _snapSub = socket.snapshots.listen(_applySnapshot);
    _statusSub = socket.status.listen((s) {
      _socketUp = s == SocketStatus.open;
      final current = state.valueOrNull;
      if (current != null) {
        state = AsyncData(current.copyWith(socketConnected: _socketUp));
      }
    });
  }

  void _applySnapshot(AvailabilitySnapshot snap) {
    final current = state.valueOrNull;
    if (current == null) return;

    final mySelected = current.selected;
    final seats = current.availability.seats.map((seat) {
      final status = snap.seats[seat.id];
      if (status == null) return seat;
      // Preserve `heldByMe` for seats we are actively selecting/holding.
      final heldByMe = seat.heldByMe && status == SeatStatus.held;
      return seat.copyWith(status: status, heldByMe: heldByMe);
    }).toList();

    // Drop any selection that was taken by someone else.
    final validSelection = {
      for (final s in seats)
        if (mySelected.contains(s.id) && s.status == SeatStatus.available) s.id,
    };

    state = AsyncData(current.copyWith(
      availability: current.availability.copyWith(
        seats: seats,
        summary: AvailabilityCounts(
          total: snap.summary.total,
          available: snap.summary.available,
          held: snap.summary.held,
          booked: snap.summary.booked,
        ),
      ),
      selected: validSelection,
    ));
  }

  void _startPollingFallback() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (!_socketUp) _refreshAvailability();
    });
  }

  Future<void> _refreshAvailability() async {
    final current = state.valueOrNull;
    if (current == null) return;
    try {
      final fresh = await _repo.getAvailability(_showId);
      final validSelection = {
        for (final s in fresh.seats)
          if (current.selected.contains(s.id) && s.status == SeatStatus.available) s.id,
      };
      state = AsyncData(current.copyWith(availability: fresh, selected: validSelection));
    } catch (_) {
      // Keep last-known state on a failed poll.
    }
  }

  void _teardown() {
    _pollTimer?.cancel();
    _snapSub?.cancel();
    _statusSub?.cancel();
    unawaited(_socket?.dispose());
  }
}

final seatMapControllerProvider =
    AsyncNotifierProvider.autoDispose.family<SeatMapController, SeatMapState, String>(
        SeatMapController.new);
