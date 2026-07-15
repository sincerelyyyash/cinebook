import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/shows_repository.dart';
import '../domain/show.dart';

/// Query args for a movie's showtimes. Equality-based so the family provider
/// caches per distinct filter combination.
class ShowtimesQuery {
  const ShowtimesQuery({required this.movieId, this.city, this.chain, this.screenType, this.format, this.date});

  final String movieId;
  final String? city;
  final String? chain;
  final String? screenType;
  final String? format;
  final String? date;

  @override
  bool operator ==(Object other) =>
      other is ShowtimesQuery &&
      other.movieId == movieId &&
      other.city == city &&
      other.chain == chain &&
      other.screenType == screenType &&
      other.format == format &&
      other.date == date;

  @override
  int get hashCode => Object.hash(movieId, city, chain, screenType, format, date);
}

final showtimesProvider =
    FutureProvider.autoDispose.family<ShowtimesResponse, ShowtimesQuery>((ref, q) {
  return ref.watch(showsRepositoryProvider).getShowtimes(
        q.movieId,
        city: q.city,
        chain: q.chain,
        screenType: q.screenType,
        format: q.format,
        date: q.date,
      );
});

final showDetailProvider =
    FutureProvider.autoDispose.family<ShowDetail, String>((ref, id) {
  return ref.watch(showsRepositoryProvider).getShow(id);
});
