import 'package:json_annotation/json_annotation.dart';

/// Domain enums, hand-mirrored from the backend Prisma schema. `@JsonValue`
/// maps each case to its exact wire string so json_serializable round-trips
/// them for free inside the freezed models. For query strings and WebSocket
/// frames we use the explicit `.wire` getters below.

enum Role {
  @JsonValue('CUSTOMER')
  customer,
  @JsonValue('HALL_MANAGER')
  hallManager,
  @JsonValue('ADMIN')
  admin,
}


enum AgeRating {
  @JsonValue('U')
  u,
  @JsonValue('UA')
  ua,
  @JsonValue('A')
  a,
}


enum Format {
  @JsonValue('TWO_D')
  twoD,
  @JsonValue('THREE_D')
  threeD,
}


enum ScreenType {
  @JsonValue('STANDARD')
  standard,
  @JsonValue('IMAX')
  imax,
  @JsonValue('FOURDX')
  fourDx,
  @JsonValue('DOLBY_ATMOS')
  dolbyAtmos,
}


enum SeatCategory {
  @JsonValue('FRONT_ROW')
  frontRow,
  @JsonValue('STANDARD')
  standard,
  @JsonValue('PREMIUM')
  premium,
  @JsonValue('RECLINER')
  recliner,
}


enum ShowStatus {
  @JsonValue('SCHEDULED')
  scheduled,
  @JsonValue('CANCELLED')
  cancelled,
  @JsonValue('COMPLETED')
  completed,
}


enum BookingStatus {
  @JsonValue('PENDING')
  pending,
  @JsonValue('CONFIRMED')
  confirmed,
  @JsonValue('CANCELLED')
  cancelled,
  @JsonValue('EXPIRED')
  expired,
  @JsonValue('REFUNDED')
  refunded,
}


enum SeatStatus {
  @JsonValue('AVAILABLE')
  available,
  @JsonValue('HELD')
  held,
  @JsonValue('BOOKED')
  booked,
}

/// Human-facing labels + presentation helpers (no design commitment — just
/// display strings and the backend-authoritative price multipliers).
extension AgeRatingX on AgeRating {
  String get label => switch (this) {
        AgeRating.u => 'U',
        AgeRating.ua => 'UA',
        AgeRating.a => 'A',
      };
  String get wire => label;
}

extension FormatX on Format {
  String get label => switch (this) {
        Format.twoD => '2D',
        Format.threeD => '3D',
      };
  String get wire => this == Format.twoD ? 'TWO_D' : 'THREE_D';
}

extension ScreenTypeX on ScreenType {
  String get label => switch (this) {
        ScreenType.standard => 'Standard',
        ScreenType.imax => 'IMAX',
        ScreenType.fourDx => '4DX',
        ScreenType.dolbyAtmos => 'Dolby Atmos',
      };
  String get wire => switch (this) {
        ScreenType.standard => 'STANDARD',
        ScreenType.imax => 'IMAX',
        ScreenType.fourDx => 'FOURDX',
        ScreenType.dolbyAtmos => 'DOLBY_ATMOS',
      };
}

extension SeatCategoryX on SeatCategory {
  String get label => switch (this) {
        SeatCategory.frontRow => 'Front Row',
        SeatCategory.standard => 'Standard',
        SeatCategory.premium => 'Premium',
        SeatCategory.recliner => 'Recliner',
      };

  String get wire => switch (this) {
        SeatCategory.frontRow => 'FRONT_ROW',
        SeatCategory.standard => 'STANDARD',
        SeatCategory.premium => 'PREMIUM',
        SeatCategory.recliner => 'RECLINER',
      };

  /// Price multiplier over the show base price. Mirrors the backend's
  /// `SEAT_CATEGORY_MULTIPLIER` — the backend remains authoritative for the
  /// actual charged price; this is for client-side estimates and the legend.
  double get multiplier => switch (this) {
        SeatCategory.frontRow => 0.8,
        SeatCategory.standard => 1.0,
        SeatCategory.premium => 1.4,
        SeatCategory.recliner => 1.8,
      };
}

/// Canonical display order for seat categories (budget → luxury).
const seatCategoryOrder = [
  SeatCategory.frontRow,
  SeatCategory.standard,
  SeatCategory.premium,
  SeatCategory.recliner,
];

/// Max seats per hold — mirrors backend `MAX_SEATS_PER_HOLD`.
const int kMaxSeatsPerHold = 10;
