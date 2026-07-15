import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/catalog_repository.dart';
import '../domain/movie.dart';
import '../domain/movie_filters.dart';

const _pageSize = 20;

/// Current catalog filters. Editing this reloads [moviesControllerProvider].
final moviesFilterProvider =
    StateProvider<MovieFilters>((ref) => const MovieFilters());

/// Accumulated, paginated movie list state.
class MoviesListState {
  const MoviesListState({
    required this.movies,
    required this.hasMore,
    required this.page,
    this.loadingMore = false,
  });

  final List<MovieSummary> movies;
  final bool hasMore;
  final int page;
  final bool loadingMore;

  MoviesListState copyWith({
    List<MovieSummary>? movies,
    bool? hasMore,
    int? page,
    bool? loadingMore,
  }) =>
      MoviesListState(
        movies: movies ?? this.movies,
        hasMore: hasMore ?? this.hasMore,
        page: page ?? this.page,
        loadingMore: loadingMore ?? this.loadingMore,
      );
}

/// Infinite-scroll movie list. `build` loads page 1 (reacting to filter
/// changes); [loadMore] appends subsequent pages.
class MoviesController extends AutoDisposeAsyncNotifier<MoviesListState> {
  @override
  Future<MoviesListState> build() async {
    final filters = ref.watch(moviesFilterProvider);
    final repo = ref.watch(catalogRepositoryProvider);
    final first = await repo.listMovies(filters, page: 1, pageSize: _pageSize);
    return MoviesListState(movies: first.items, hasMore: first.hasMore, page: 1);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore) return;

    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final filters = ref.read(moviesFilterProvider);
      final repo = ref.read(catalogRepositoryProvider);
      final next =
          await repo.listMovies(filters, page: current.page + 1, pageSize: _pageSize);
      state = AsyncData(current.copyWith(
        movies: [...current.movies, ...next.items],
        hasMore: next.hasMore,
        page: current.page + 1,
        loadingMore: false,
      ));
    } catch (_) {
      // Keep existing items; just stop the spinner.
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }

  Future<void> refresh() {
    ref.invalidateSelf();
    return future;
  }
}

final moviesControllerProvider =
    AutoDisposeAsyncNotifierProvider<MoviesController, MoviesListState>(
        MoviesController.new);

/* ── Simple read providers ─────────────────────────────────────────────────── */

final trendingMoviesProvider = FutureProvider.autoDispose<List<MovieSummary>>((ref) {
  return ref.watch(catalogRepositoryProvider).getTrending();
});

final upcomingMoviesProvider = FutureProvider.autoDispose<List<MovieSummary>>((ref) async {
  final page = await ref.watch(catalogRepositoryProvider).getUpcoming();
  return page.items;
});

final genresProvider = FutureProvider.autoDispose<List<Genre>>((ref) {
  return ref.watch(catalogRepositoryProvider).listGenres();
});

final movieDetailProvider =
    FutureProvider.autoDispose.family<MovieDetail, String>((ref, id) {
  return ref.watch(catalogRepositoryProvider).getMovie(id);
});

final similarMoviesProvider =
    FutureProvider.autoDispose.family<List<MovieSummary>, String>((ref, id) {
  return ref.watch(catalogRepositoryProvider).getSimilar(id);
});

final movieReviewsProvider =
    FutureProvider.autoDispose.family<List<Review>, String>((ref, id) async {
  final page = await ref.watch(catalogRepositoryProvider).listReviews(id);
  return page.items;
});
