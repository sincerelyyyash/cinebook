import 'package:intl/intl.dart';

/// Date/time formatting for ISO-8601 strings coming off the wire. Everything
/// is parsed as UTC and rendered in the device's local zone.
class DateFmt {
  const DateFmt._();

  static final _time = DateFormat('h:mm a');
  static final _dayMonth = DateFormat('EEE, d MMM');
  static final _dayMonthYear = DateFormat('d MMM yyyy');
  static final _full = DateFormat('EEE, d MMM · h:mm a');
  static final _isoDate = DateFormat('yyyy-MM-dd');

  static DateTime parse(String iso) => DateTime.parse(iso).toLocal();

  static String time(String iso) => _time.format(parse(iso));
  static String dayMonth(String iso) => _dayMonth.format(parse(iso));
  static String dayMonthYear(String iso) => _dayMonthYear.format(parse(iso));
  static String full(String iso) => _full.format(parse(iso));

  /// `yyyy-MM-dd` in local time — the format show/showtime filters expect.
  static String isoDate(DateTime d) => _isoDate.format(d);

  /// Human "time remaining" for hold countdowns: `4:37`, `0:09`, `expired`.
  static String countdown(Duration remaining) {
    if (remaining.isNegative || remaining == Duration.zero) return 'expired';
    final m = remaining.inMinutes;
    final s = remaining.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}
