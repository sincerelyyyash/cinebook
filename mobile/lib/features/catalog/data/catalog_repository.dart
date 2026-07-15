import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/paginated.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/movie.dart';
import '../domain/movie_filters.dart';

/// Read-only catalog endpoints (movies, genres, reviews). All public — no auth
/// required — so browsing works before login.
class CatalogRepository {
  CatalogRepository(this._client);

  final ApiClient _client;

  Future<Paginated<MovieSummary>> listMovies(
    MovieFilters filters, {
    int page = 1,
    int pageSize = 20,
  }) {
    return _client.get<Paginated<MovieSummary>>(
      '/movies',
      query: filters.toQuery(page: page, pageSize: pageSize),
      decode: (d) => Paginated.fromJson(
        (d as Map).cast<String, dynamic>(),
        MovieSummary.fromJson,
      ),
    );
  }

  Future<MovieDetail> getMovie(String id) {
    return _client.get<MovieDetail>(
      '/movies/$id',
      decode: (d) => MovieDetail.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<List<CastMember>> getCast(String id) {
    return _client.get<List<CastMember>>(
      '/movies/$id/cast',
      decode: (d) => (d as List)
          .map((e) => CastMember.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }

  Future<List<MovieSummary>> getSimilar(String id) {
    return _client.get<List<MovieSummary>>(
      '/movies/$id/similar',
      decode: (d) => (d as List)
          .map((e) => MovieSummary.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }

  Future<List<MovieSummary>> getTrending() {
    return _client.get<List<MovieSummary>>(
      '/movies/trending',
      decode: (d) => (d as List)
          .map((e) => MovieSummary.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }

  Future<Paginated<MovieSummary>> getUpcoming() {
    return _client.get<Paginated<MovieSummary>>(
      '/movies/upcoming',
      decode: (d) => Paginated.fromJson(
        (d as Map).cast<String, dynamic>(),
        MovieSummary.fromJson,
      ),
    );
  }

  Future<Paginated<Review>> listReviews(String id) {
    return _client.get<Paginated<Review>>(
      '/movies/$id/reviews',
      decode: (d) => Paginated.fromJson(
        (d as Map).cast<String, dynamic>(),
        Review.fromJson,
      ),
    );
  }

  Future<List<Genre>> listGenres() {
    return _client.get<List<Genre>>(
      '/genres',
      decode: (d) => (d as List)
          .map((e) => Genre.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }
}

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  return CatalogRepository(ref.watch(apiClientProvider));
});
