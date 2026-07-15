import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/domain/enums.dart';

part 'movie.freezed.dart';
part 'movie.g.dart';

/// Aggregate rating shown on cards/detail.
@freezed
class MovieRating with _$MovieRating {
  const factory MovieRating({
    @Default(0) double average,
    @Default(0) int count,
  }) = _MovieRating;

  factory MovieRating.fromJson(Map<String, dynamic> json) => _$MovieRatingFromJson(json);
}

@freezed
class CastMember with _$CastMember {
  const factory CastMember({
    required String name,
    required String role,
    String? photoUrl,
  }) = _CastMember;

  factory CastMember.fromJson(Map<String, dynamic> json) => _$CastMemberFromJson(json);
}

/// List/card view of a movie (`GET /movies`, `/trending`, `/upcoming`,
/// `/movies/:id/similar`).
@freezed
class MovieSummary with _$MovieSummary {
  const factory MovieSummary({
    required String id,
    required String title,
    required int runtimeMin,
    required String releaseDate,
    required String language,
    required AgeRating ageRating,
    String? posterUrl,
    @Default(<String>[]) List<String> genres,
    @Default(false) bool isTrending,
    @Default(MovieRating()) MovieRating rating,
  }) = _MovieSummary;

  factory MovieSummary.fromJson(Map<String, dynamic> json) => _$MovieSummaryFromJson(json);
}

/// Full detail (`GET /movies/:id`).
@freezed
class MovieDetail with _$MovieDetail {
  const factory MovieDetail({
    required String id,
    required String title,
    required int runtimeMin,
    required String releaseDate,
    required String language,
    required AgeRating ageRating,
    String? posterUrl,
    @Default(<String>[]) List<String> genres,
    @Default(false) bool isTrending,
    @Default(MovieRating()) MovieRating rating,
    @Default('') String description,
    String? trailerUrl,
    @Default(<CastMember>[]) List<CastMember> cast,
  }) = _MovieDetail;

  factory MovieDetail.fromJson(Map<String, dynamic> json) => _$MovieDetailFromJson(json);
}

@freezed
class Review with _$Review {
  const factory Review({
    required String id,
    required String author,
    required double rating,
    required String comment,
    required String createdAt,
  }) = _Review;

  factory Review.fromJson(Map<String, dynamic> json) => _$ReviewFromJson(json);
}

@freezed
class Genre with _$Genre {
  const factory Genre({
    required String id,
    required String name,
    @Default(0) int movieCount,
  }) = _Genre;

  factory Genre.fromJson(Map<String, dynamic> json) => _$GenreFromJson(json);
}
