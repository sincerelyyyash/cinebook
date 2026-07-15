import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../shared/ui/category_chip.dart';
import '../../../shared/ui/error_state.dart';
import '../../../shared/ui/press_scale.dart';
import '../../../shared/ui/section_header.dart';
import '../../../shared/ui/skeleton.dart';
import '../application/catalog_controllers.dart';
import 'widgets/filter_sheet.dart';
import 'widgets/movie_card.dart';

/// Home / browse: greeting header, search, genre chips, a trending rail, and a
/// filterable infinite-scroll grid. Skeletons while loading; staggered entrance.
class MoviesScreen extends ConsumerStatefulWidget {
  const MoviesScreen({super.key});

  @override
  ConsumerState<MoviesScreen> createState() => _MoviesScreenState();
}

class _MoviesScreenState extends ConsumerState<MoviesScreen> {
  final _scroll = ScrollController();
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 400) {
      ref.read(moviesControllerProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _applySearch(String value) {
    final current = ref.read(moviesFilterProvider);
    ref.read(moviesFilterProvider.notifier).state =
        current.copyWith(search: value.trim(), clearSearch: value.trim().isEmpty);
  }

  @override
  Widget build(BuildContext context) {
    final moviesAsync = ref.watch(moviesControllerProvider);
    final filters = ref.watch(moviesFilterProvider);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: AppColors.surfaceHigh,
          onRefresh: () => ref.read(moviesControllerProvider.notifier).refresh(),
          child: CustomScrollView(
            controller: _scroll,
            slivers: [
              const SliverToBoxAdapter(child: _Header()),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                      AppSpacing.screen, AppSpacing.xs, AppSpacing.screen, AppSpacing.sm),
                  child: _SearchBar(
                    controller: _searchCtrl,
                    onSubmit: _applySearch,
                    activeFilters: filters.activeCount,
                    onFilter: () => FilterSheet.show(context),
                  ),
                ),
              ),
              SliverToBoxAdapter(child: _GenreChips(selected: filters.genre)),
              if (filters.isEmpty) const SliverToBoxAdapter(child: _TrendingSection()),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                      AppSpacing.screen, AppSpacing.lg, AppSpacing.screen, AppSpacing.sm),
                  child: SectionHeader(title: filters.isEmpty ? 'Now showing' : 'Results'),
                ),
              ),
              ...moviesAsync.when<List<Widget>>(
                loading: () => const [SliverToBoxAdapter(child: PosterGridSkeleton())],
                error: (_, __) => [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorState(
                      message: 'Could not load movies.',
                      onRetry: () => ref.invalidate(moviesControllerProvider),
                    ),
                  ),
                ],
                data: (state) => _grid(context, state),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _grid(BuildContext context, MoviesListState state) {
    if (state.movies.isEmpty) {
      return const [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyStateView(
            icon: PhosphorIconsRegular.magnifyingGlass,
            message: 'No movies match your filters.',
          ),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screen),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 180,
            childAspectRatio: 0.52,
            crossAxisSpacing: AppSpacing.md,
            mainAxisSpacing: AppSpacing.lg,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, i) {
              final movie = state.movies[i];
              return MovieCard(
                movie: movie,
                onTap: () => context.push('/movies/${movie.id}'),
              ).animate().fadeIn(duration: 300.ms, delay: (30 * (i % 8)).ms).slideY(begin: 0.08, end: 0);
            },
            childCount: state.movies.length,
          ),
        ),
      ),
      if (state.loadingMore)
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Center(child: CircularProgressIndicator()),
          ),
        ),
    ];
  }
}

class _Header extends ConsumerWidget {
  const _Header();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.screen, AppSpacing.md, AppSpacing.screen, 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(PhosphorIconsFill.mapPin, size: 15, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text('Near you',
                        style: textTheme.labelMedium?.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
                const SizedBox(height: 2),
                Text("What's playing", style: textTheme.headlineSmall),
              ],
            ),
          ),
          Container(
            height: 44,
            width: 44,
            decoration: BoxDecoration(
              color: AppColors.surfaceHigh,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(PhosphorIconsRegular.bell, size: 22),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1, end: 0);
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.controller,
    required this.onSubmit,
    required this.activeFilters,
    required this.onFilter,
  });

  final TextEditingController controller;
  final ValueChanged<String> onSubmit;
  final int activeFilters;
  final VoidCallback onFilter;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            textInputAction: TextInputAction.search,
            onSubmitted: onSubmit,
            decoration: const InputDecoration(
              hintText: 'Search movies, genres…',
              prefixIcon: Icon(PhosphorIconsRegular.magnifyingGlass, color: AppColors.textTertiary),
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        PressScale(
          onTap: onFilter,
          child: Container(
            height: 52,
            width: 52,
            decoration: BoxDecoration(
              color: AppColors.surfaceHigh,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: activeFilters > 0 ? AppColors.borderStrong : AppColors.border),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(PhosphorIconsRegular.slidersHorizontal),
                if (activeFilters > 0)
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      height: 8,
                      width: 8,
                      decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _GenreChips extends ConsumerWidget {
  const _GenreChips({required this.selected});
  final String? selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final genres = ref.watch(genresProvider);
    return genres.maybeWhen(
      data: (list) {
        if (list.isEmpty) return const SizedBox.shrink();
        return SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screen),
            children: [
              CategoryChip(
                label: 'All',
                selected: selected == null,
                onTap: () {
                  final f = ref.read(moviesFilterProvider);
                  ref.read(moviesFilterProvider.notifier).state = f.copyWith(clearGenre: true);
                },
              ),
              const SizedBox(width: AppSpacing.xs),
              for (final g in list) ...[
                CategoryChip(
                  label: g.name,
                  selected: selected == g.name,
                  onTap: () {
                    final f = ref.read(moviesFilterProvider);
                    ref.read(moviesFilterProvider.notifier).state =
                        f.copyWith(genre: g.name, clearGenre: selected == g.name);
                  },
                ),
                const SizedBox(width: AppSpacing.xs),
              ],
            ],
          ),
        );
      },
      orElse: () => const SizedBox(height: 44),
    );
  }
}

class _TrendingSection extends ConsumerWidget {
  const _TrendingSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trending = ref.watch(trendingMoviesProvider);
    return trending.maybeWhen(
      data: (movies) {
        if (movies.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(AppSpacing.screen, AppSpacing.lg, AppSpacing.screen, AppSpacing.sm),
              child: SectionHeader(title: 'Trending now'),
            ),
            SizedBox(
              height: 232,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screen),
                itemCount: movies.length,
                separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
                itemBuilder: (context, i) => MovieCard(
                  movie: movies[i],
                  width: 128,
                  onTap: () => context.push('/movies/${movies[i].id}'),
                ),
              ),
            ),
          ],
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}
