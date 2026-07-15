import 'package:intl/intl.dart';

/// All monetary amounts from the backend are **integer paise** (₹1 = 100
/// paise). Format for display without ever doing float math on money.
class Money {
  const Money._();

  static final NumberFormat _inr = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );

  /// `12345` (paise) → `₹123.45`.
  static String format(int paise) => _inr.format(paise / 100);

  /// `12300` (paise) → `₹123` (drops `.00`), else `₹123.45`.
  static String formatCompact(int paise) {
    final rupees = paise / 100;
    if (paise % 100 == 0) {
      return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0)
          .format(rupees);
    }
    return _inr.format(rupees);
  }
}
