import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/env.dart';
import '../domain/enums.dart';

/// A single live-availability snapshot pushed by the backend on every seat
/// state change for a show.
class AvailabilitySnapshot {
  const AvailabilitySnapshot({required this.showId, required this.summary, required this.seats});

  final String showId;
  final AvailabilitySummary summary;

  /// Sparse per-seat status updates: `{ id, status }`.
  final Map<String, SeatStatus> seats;
}

class AvailabilitySummary {
  const AvailabilitySummary({
    required this.total,
    required this.available,
    required this.held,
    required this.booked,
  });

  final int total;
  final int available;
  final int held;
  final int booked;

  factory AvailabilitySummary.fromJson(Map<String, dynamic> j) => AvailabilitySummary(
        total: (j['total'] as num?)?.toInt() ?? 0,
        available: (j['available'] as num?)?.toInt() ?? 0,
        held: (j['held'] as num?)?.toInt() ?? 0,
        booked: (j['booked'] as num?)?.toInt() ?? 0,
      );
}

/// Live seat-availability socket. Speaks the backend `/ws` protocol:
///
/// ```
/// client → { action: 'subscribe',   showId }
/// client → { action: 'unsubscribe', showId }
/// server → { type: 'availability', showId, summary, seats: [{ id, status }] }
/// ```
///
/// Reconnects with exponential backoff. The seat-map controller maps each
/// snapshot onto its state and falls back to `GET /shows/:id/seats` polling
/// when the socket can't connect. One channel per subscribed show.
class SeatSocket {
  SeatSocket(this.showId);

  final String showId;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _sub;
  Timer? _reconnectTimer;
  bool _closed = false;
  int _retry = 0;

  final _snapshots = StreamController<AvailabilitySnapshot>.broadcast();
  final _status = StreamController<SocketStatus>.broadcast();

  Stream<AvailabilitySnapshot> get snapshots => _snapshots.stream;
  Stream<SocketStatus> get status => _status.stream;

  void connect() {
    if (_closed) return;
    try {
      _channel = WebSocketChannel.connect(Uri.parse(Env.wsUrl));
    } catch (_) {
      _emitStatus(SocketStatus.error);
      _scheduleReconnect();
      return;
    }

    _sub = _channel!.stream.listen(
      _onMessage,
      onError: (_) {
        _emitStatus(SocketStatus.error);
        _scheduleReconnect();
      },
      onDone: () {
        _emitStatus(SocketStatus.closed);
        _scheduleReconnect();
      },
      cancelOnError: true,
    );

    _retry = 0;
    _emitStatus(SocketStatus.open);
    _send({'action': 'subscribe', 'showId': showId});
  }

  void _onMessage(dynamic raw) {
    try {
      final msg = jsonDecode(raw as String);
      if (msg is! Map) return;
      if (msg['type'] != 'availability' || msg['showId'] != showId) return;

      final seats = <String, SeatStatus>{};
      for (final s in (msg['seats'] as List? ?? const [])) {
        final m = (s as Map).cast<String, dynamic>();
        final status = _statusFromWire(m['status'] as String?);
        if (status != null) seats[m['id'] as String] = status;
      }

      _snapshots.add(AvailabilitySnapshot(
        showId: showId,
        summary: AvailabilitySummary.fromJson(
          (msg['summary'] as Map?)?.cast<String, dynamic>() ?? const {},
        ),
        seats: seats,
      ));
    } catch (_) {
      // Ignore malformed frames.
    }
  }

  void _send(Map<String, dynamic> data) {
    try {
      _channel?.sink.add(jsonEncode(data));
    } catch (_) {/* socket not ready */}
  }

  void _scheduleReconnect() {
    if (_closed) return;
    _sub?.cancel();
    _retry += 1;
    final delayMs = (1000 * (1 << _retry)).clamp(1000, 15000);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: delayMs), connect);
  }

  void _emitStatus(SocketStatus s) {
    if (!_status.isClosed) _status.add(s);
  }

  Future<void> dispose() async {
    _closed = true;
    _reconnectTimer?.cancel();
    _send({'action': 'unsubscribe', 'showId': showId});
    await _sub?.cancel();
    await _channel?.sink.close();
    await _snapshots.close();
    await _status.close();
  }

  static SeatStatus? _statusFromWire(String? wire) => switch (wire) {
        'AVAILABLE' => SeatStatus.available,
        'HELD' => SeatStatus.held,
        'BOOKED' => SeatStatus.booked,
        _ => null,
      };
}

enum SocketStatus { open, closed, error }
