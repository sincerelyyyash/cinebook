import 'package:cinebook/core/domain/enums.dart';
import 'package:cinebook/features/catalog/domain/movie_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('MovieFilters.toQuery', () {
    test('always includes pagination + sort defaults', () {
      final q = const MovieFilters().toQuery(page: 2, pageSize: 20);
      expect(q['page'], 2);
      expect(q['pageSize'], 20);
      expect(q['sort'], 'releaseDate');
      expect(q['order'], 'desc');
    });

    test('drops empty facets and maps enum wire values', () {
      final q = const MovieFilters(
        genre: 'Sci-Fi',
        screenType: ScreenType.imax,
        format: Format.threeD,
        ageRating: AgeRating.ua,
      ).toQuery(page: 1, pageSize: 20);

      expect(q['genre'], 'Sci-Fi');
      expect(q['screenType'], 'IMAX');
      expect(q['format'], 'THREE_D');
      expect(q['ageRating'], 'UA');
      expect(q.containsKey('language'), isFalse);
      expect(q.containsKey('search'), isFalse);
    });

    test('activeCount counts only non-default facets', () {
      expect(const MovieFilters().activeCount, 0);
      expect(const MovieFilters(genre: 'Action', format: Format.twoD).activeCount, 2);
    });

    test('copyWith clear flags remove a facet', () {
      const base = MovieFilters(genre: 'Action');
      expect(base.copyWith(clearGenre: true).genre, isNull);
    });
  });
}
