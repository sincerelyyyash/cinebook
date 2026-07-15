/// Simulated-gateway test cards — mirror backend `src/services/payment-gateway.ts`.
/// Behaviour is driven entirely by the card number so error handling (§1.2,
/// §3.2) can be demonstrated end-to-end.
enum TestCardKind { success, fail, random, error }

class TestCard {
  const TestCard(this.label, this.number, this.kind);
  final String label;
  final String number;
  final TestCardKind kind;
}

const kTestCards = <TestCard>[
  TestCard('Always succeeds', '4111 1111 1111 1111', TestCardKind.success),
  TestCard('Always declined', '4000 0000 0000 0002', TestCardKind.fail),
  TestCard('Insufficient funds', '4000 0000 0000 9995', TestCardKind.fail),
  TestCard('Random failure', '4000 0000 0000 0119', TestCardKind.random),
  TestCard('Gateway error', '4000 0000 0000 0000', TestCardKind.error),
];

String formatCardNumber(String v) {
  final digits = v.replaceAll(RegExp(r'\D'), '');
  final trimmed = digits.length > 19 ? digits.substring(0, 19) : digits;
  final buf = StringBuffer();
  for (var i = 0; i < trimmed.length; i++) {
    if (i > 0 && i % 4 == 0) buf.write(' ');
    buf.write(trimmed[i]);
  }
  return buf.toString();
}
