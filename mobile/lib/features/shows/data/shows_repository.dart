import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/paginated.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/show.dart';

/// Shows & showtimes reads (public). Filters mirror the customer booking
/// journey step 2 (date, location, screen type, format).
class ShowsRepository {
  ShowsRepository(this._client);

  final ApiClient _client;

  Future<Paginated<ShowSummary>> listShows({
    String? movieId,
    String? theatreId,
    String? city,
    String? chain,
    String? screenType,
    String? format,
    String? date,
    int page = 1,
    int pageSize = 50,
  }) {
    final query = <String, dynamic>{'page': page, 'pageSize': pageSize};
    void put(String k, Object? v) {
      if (v != null && v.toString().isNotEmpty) query[k] = v;
    }

    put('movieId', movieId);
    put('theatreId', theatreId);
    put('city', city);
    put('chain', chain);
    put('screenType', screenType);
    put('format', format);
    put('date', date);

    return _client.get<Paginated<ShowSummary>>(
      '/shows',
      query: query,
      decode: (d) =>
          Paginated.fromJson((d as Map).cast<String, dynamic>(), ShowSummary.fromJson),
    );
  }

  /// `GET /shows/showtimes?movieId=...` — theatres → dates → shows.
  Future<ShowtimesResponse> getShowtimes(
    String movieId, {
    String? city,
    String? chain,
    String? screenType,
    String? format,
    String? date,
  }) {
    final query = <String, dynamic>{'movieId': movieId};
    void put(String k, Object? v) {
      if (v != null && v.toString().isNotEmpty) query[k] = v;
    }

    put('city', city);
    put('chain', chain);
    put('screenType', screenType);
    put('format', format);
    put('date', date);

    return _client.get<ShowtimesResponse>(
      '/shows/showtimes',
      query: query,
      decode: (d) => ShowtimesResponse.fromJson((d as Map).cast<String, dynamic>()),
    );
  }

  Future<ShowDetail> getShow(String id) {
    return _client.get<ShowDetail>(
      '/shows/$id',
      decode: (d) => ShowDetail.fromJson((d as Map).cast<String, dynamic>()),
    );
  }
}

final showsRepositoryProvider = Provider<ShowsRepository>((ref) {
  return ShowsRepository(ref.watch(apiClientProvider));
});
