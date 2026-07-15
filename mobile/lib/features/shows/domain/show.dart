import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/domain/enums.dart';

part 'show.freezed.dart';
part 'show.g.dart';

/// A single scheduled show (`GET /shows`, `/shows/:id`).
@freezed
class ShowSummary with _$ShowSummary {
  const factory ShowSummary({
    required String id,
    required String movieId,
    required String movieTitle,
    required String screenId,
    required String screenName,
    required ScreenType screenType,
    required String theatreId,
    required String theatreName,
    required String theatreChain,
    required String city,
    required String startsAt,
    required String endsAt,
    required Format format,
    required int basePrice,
    required ShowStatus status,
  }) = _ShowSummary;

  factory ShowSummary.fromJson(Map<String, dynamic> json) => _$ShowSummaryFromJson(json);
}

@freezed
class ShowDetail with _$ShowDetail {
  const factory ShowDetail({
    required String id,
    required String movieId,
    required String movieTitle,
    required String screenId,
    required String screenName,
    required ScreenType screenType,
    required String theatreId,
    required String theatreName,
    required String theatreChain,
    required String city,
    required String startsAt,
    required String endsAt,
    required Format format,
    required int basePrice,
    required ShowStatus status,
    required int runtimeMin,
    required Map<String, int> priceByCategory,
  }) = _ShowDetail;

  factory ShowDetail.fromJson(Map<String, dynamic> json) => _$ShowDetailFromJson(json);
}

/* ── Showtimes (grouped by theatre → date), `GET /shows/showtimes` ──────────── */

@freezed
class ShowtimeShow with _$ShowtimeShow {
  const factory ShowtimeShow({
    required String showId,
    required String startsAt,
    required String endsAt,
    required Format format,
    required String screenId,
    required String screenName,
    required ScreenType screenType,
    required int basePrice,
  }) = _ShowtimeShow;

  factory ShowtimeShow.fromJson(Map<String, dynamic> json) => _$ShowtimeShowFromJson(json);
}

@freezed
class ShowtimeDateGroup with _$ShowtimeDateGroup {
  const factory ShowtimeDateGroup({
    required String date,
    required List<ShowtimeShow> shows,
  }) = _ShowtimeDateGroup;

  factory ShowtimeDateGroup.fromJson(Map<String, dynamic> json) =>
      _$ShowtimeDateGroupFromJson(json);
}

@freezed
class ShowtimeTheatreGroup with _$ShowtimeTheatreGroup {
  const factory ShowtimeTheatreGroup({
    required String theatreId,
    required String theatreName,
    required String chain,
    required String city,
    required List<ShowtimeDateGroup> dates,
  }) = _ShowtimeTheatreGroup;

  factory ShowtimeTheatreGroup.fromJson(Map<String, dynamic> json) =>
      _$ShowtimeTheatreGroupFromJson(json);
}

/// `GET /shows/showtimes` — theatres grouped under the movie. Note: this is an
/// **object**, not a bare array.
@freezed
class ShowtimesResponse with _$ShowtimesResponse {
  const factory ShowtimesResponse({
    required String movieId,
    required String movieTitle,
    required List<ShowtimeTheatreGroup> theatres,
  }) = _ShowtimesResponse;

  factory ShowtimesResponse.fromJson(Map<String, dynamic> json) =>
      _$ShowtimesResponseFromJson(json);
}
