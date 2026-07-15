/// Generic pagination envelope. The backend shape is
/// `{ data: T[], pagination: { page, pageSize, total, totalPages, hasMore } }`.
///
/// Hand-written (rather than freezed) because a generic `fromJson` needs an
/// item parser injected at the call site, which codegen unions handle poorly.
class Paginated<T> {
  const Paginated({required this.items, required this.pagination});

  final List<T> items;
  final PageInfo pagination;

  bool get hasMore => pagination.hasMore;
  bool get isEmpty => items.isEmpty;

  factory Paginated.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic> item) itemFromJson,
  ) {
    final rawItems = (json['data'] as List? ?? const [])
        .map((e) => itemFromJson((e as Map).cast<String, dynamic>()))
        .toList(growable: false);
    return Paginated(
      items: rawItems,
      pagination: PageInfo.fromJson(
        (json['pagination'] as Map?)?.cast<String, dynamic>() ?? const {},
      ),
    );
  }

  Paginated<T> concat(Paginated<T> next) =>
      Paginated(items: [...items, ...next.items], pagination: next.pagination);
}

class PageInfo {
  const PageInfo({
    required this.page,
    required this.pageSize,
    required this.total,
    required this.totalPages,
    required this.hasMore,
  });

  final int page;
  final int pageSize;
  final int total;
  final int totalPages;
  final bool hasMore;

  factory PageInfo.fromJson(Map<String, dynamic> json) => PageInfo(
        page: (json['page'] as num?)?.toInt() ?? 1,
        pageSize: (json['pageSize'] as num?)?.toInt() ?? 0,
        total: (json['total'] as num?)?.toInt() ?? 0,
        totalPages: (json['totalPages'] as num?)?.toInt() ?? 0,
        hasMore: json['hasMore'] as bool? ?? false,
      );
}
