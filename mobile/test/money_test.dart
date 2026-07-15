import 'package:cinebook/core/utils/money.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Money.format (paise → ₹)', () {
    test('formats whole rupees with two decimals', () {
      expect(Money.format(12345), '₹123.45');
    });

    test('formats round amounts', () {
      expect(Money.format(10000), '₹100.00');
    });

    test('compact drops .00 for round amounts', () {
      expect(Money.formatCompact(12300), '₹123');
      expect(Money.formatCompact(12345), '₹123.45');
    });
  });
}
