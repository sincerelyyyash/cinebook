import '../../../core/domain/enums.dart';

/// Customer movie filters (§1.2). Maps to the `GET /movies` query params. All
/// fields are optional; empty ones are dropped from the query string.
class MovieFilters {
  const MovieFilters({
    this.search,
    this.genre,
    this.language,
    this.ageRating,
    this.chain,
    this.screenType,
    this.format,
    this.releaseFrom,
    this.releaseTo,
    this.sort = 'releaseDate',
    this.order = 'desc',
  });

  final String? search;
  final String? genre;
  final String? language;
  final AgeRating? ageRating;
  final String? chain;
  final ScreenType? screenType;
  final Format? format;
  final String? releaseFrom; // yyyy-MM-dd
  final String? releaseTo; // yyyy-MM-dd
  final String sort; // 'releaseDate' | 'title'
  final String order; // 'asc' | 'desc'

  bool get isEmpty =>
      (search == null || search!.isEmpty) &&
      genre == null &&
      language == null &&
      ageRating == null &&
      chain == null &&
      screenType == null &&
      format == null &&
      releaseFrom == null &&
      releaseTo == null;

  /// Number of active (non-default) facets — for a filter-count badge.
  int get activeCount => [
        genre,
        language,
        ageRating,
        chain,
        screenType,
        format,
        releaseFrom,
        releaseTo,
      ].where((e) => e != null).length;

  Map<String, dynamic> toQuery({required int page, required int pageSize}) {
    final q = <String, dynamic>{
      'page': page,
      'pageSize': pageSize,
      'sort': sort,
      'order': order,
    };
    void put(String key, Object? value) {
      if (value != null && value.toString().isNotEmpty) q[key] = value;
    }

    put('search', search);
    put('genre', genre);
    put('language', language);
    put('ageRating', ageRating?.wire);
    put('chain', chain);
    put('screenType', screenType?.wire);
    put('format', format?.wire);
    put('releaseDateFrom', releaseFrom);
    put('releaseDateTo', releaseTo);
    return q;
  }

  MovieFilters copyWith({
    String? search,
    String? genre,
    String? language,
    AgeRating? ageRating,
    String? chain,
    ScreenType? screenType,
    Format? format,
    String? releaseFrom,
    String? releaseTo,
    String? sort,
    String? order,
    bool clearSearch = false,
    bool clearGenre = false,
    bool clearLanguage = false,
    bool clearAgeRating = false,
    bool clearChain = false,
    bool clearScreenType = false,
    bool clearFormat = false,
    bool clearReleaseFrom = false,
    bool clearReleaseTo = false,
  }) {
    return MovieFilters(
      search: clearSearch ? null : (search ?? this.search),
      genre: clearGenre ? null : (genre ?? this.genre),
      language: clearLanguage ? null : (language ?? this.language),
      ageRating: clearAgeRating ? null : (ageRating ?? this.ageRating),
      chain: clearChain ? null : (chain ?? this.chain),
      screenType: clearScreenType ? null : (screenType ?? this.screenType),
      format: clearFormat ? null : (format ?? this.format),
      releaseFrom: clearReleaseFrom ? null : (releaseFrom ?? this.releaseFrom),
      releaseTo: clearReleaseTo ? null : (releaseTo ?? this.releaseTo),
      sort: sort ?? this.sort,
      order: order ?? this.order,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is MovieFilters &&
      other.search == search &&
      other.genre == genre &&
      other.language == language &&
      other.ageRating == ageRating &&
      other.chain == chain &&
      other.screenType == screenType &&
      other.format == format &&
      other.releaseFrom == releaseFrom &&
      other.releaseTo == releaseTo &&
      other.sort == sort &&
      other.order == order;

  @override
  int get hashCode => Object.hash(search, genre, language, ageRating, chain,
      screenType, format, releaseFrom, releaseTo, sort, order);
}
