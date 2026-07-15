import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../shared/ui/app_button.dart';
import '../../../shared/ui/network_image.dart';
import '../../../shared/ui/pills.dart';
import '../../../shared/ui/section_header.dart';
import '../../../shared/ui/skeleton.dart';
import '../../../shared/widgets/async_value_view.dart';
import '../application/catalog_controllers.dart';
import '../domain/movie.dart';
import 'widgets/movie_card.dart';

/// Full movie detail: hero poster with scrim, meta, synopsis, cast, reviews,
/// similar titles, and a sticky "See showtimes" CTA.
class MovieDetailScreen extends ConsumerWidget {
  const MovieDetailScreen({super.key, required this.movieId});

  final String movieId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(movieDetailProvider(movieId));

    return Scaffold(
      body: AsyncValueView<MovieDetail>(
        value: detail,
        onRetry: () => ref.invalidate(movieDetailProvider(movieId)),
        loading: const _DetailSkeleton(),
        data: (movie) => _Content(movie: movie, movieId: movieId),
      ),
      bottomNavigationBar: detail.maybeWhen(
        data: (_) => Container(
          decoration: const BoxDecoration(
            color: AppColors.background,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: AppButton(
                label: 'See showtimes',
                icon: PhosphorIconsRegular.armchair,
                onPressed: () => context.push('/movies/$movieId/showtimes'),
              ),
            ),
          ),
        ),
        orElse: () => const SizedBox.shrink(),
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.movie, required this.movieId});
  final MovieDetail movie;
  final String movieId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 420,
          pinned: true,
          stretch: true,
          leading: const _CircleBackButton(),
          backgroundColor: AppColors.background,
          flexibleSpace: FlexibleSpaceBar(
            stretchModes: const [StretchMode.zoomBackground],
            background: Stack(
              fit: StackFit.expand,
              children: [
                Hero(
                  tag: 'poster-$movieId',
                  child: AppNetworkImage(url: movie.posterUrl, fallbackText: movie.title),
                ),
                const DecoratedBox(decoration: BoxDecoration(gradient: AppColors.posterScrim)),
                Positioned(
                  left: AppSpacing.screen,
                  right: AppSpacing.screen,
                  bottom: AppSpacing.lg,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(movie.title, style: textTheme.displaySmall),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.xs,
                        runSpacing: AppSpacing.xs,
                        children: [
                          if (movie.rating.count > 0) RatingPill(rating: movie.rating.average),
                          MetaPill('${movie.runtimeMin} min'),
                          MetaPill(movie.language),
                          MetaPill(movie.ageRating.label),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.screen),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (movie.genres.isNotEmpty) ...[
                  Wrap(
                    spacing: AppSpacing.xs,
                    runSpacing: AppSpacing.xs,
                    children: [for (final g in movie.genres) MetaPill(g, filled: true)],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],
                Text('Synopsis', style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(movie.description,
                    style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                if (movie.cast.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.xl),
                  Text('Cast & crew', style: textTheme.titleMedium),
                  const SizedBox(height: AppSpacing.sm),
                  _CastRow(cast: movie.cast),
                ],
                const SizedBox(height: AppSpacing.xl),
                _ReviewsSection(movieId: movieId),
                const SizedBox(height: AppSpacing.xl),
                _SimilarSection(movieId: movieId),
                const SizedBox(height: 90),
              ],
            ),
          ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.03, end: 0),
        ),
      ],
    );
  }
}

class _CircleBackButton extends StatelessWidget {
  const _CircleBackButton();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: GestureDetector(
        onTap: () => Navigator.of(context).maybePop(),
        child: Container(
          height: 38,
          width: 38,
          decoration: BoxDecoration(color: AppColors.overlay, shape: BoxShape.circle),
          child: const Icon(PhosphorIconsRegular.caretLeft, size: 16),
        ),
      ),
    );
  }
}

class _CastRow extends StatelessWidget {
  const _CastRow({required this.cast});
  final List<CastMember> cast;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 108,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: cast.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
        itemBuilder: (context, i) {
          final member = cast[i];
          return SizedBox(
            width: 76,
            child: Column(
              children: [
                Container(
                  height: 60,
                  width: 60,
                  decoration: const BoxDecoration(shape: BoxShape.circle),
                  clipBehavior: Clip.antiAlias,
                  child: AppNetworkImage(url: member.photoUrl, fallbackText: member.name),
                ),
                const SizedBox(height: 6),
                Text(member.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall),
                Text(member.role,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall
                        ?.copyWith(color: AppColors.textTertiary, fontSize: 10)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ReviewsSection extends ConsumerWidget {
  const _ReviewsSection({required this.movieId});
  final String movieId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(movieReviewsProvider(movieId));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Reviews', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        reviews.when(
          loading: () => const Skeleton(height: 60, radius: AppRadius.md),
          error: (_, __) => Text('Could not load reviews.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textTertiary)),
          data: (list) => list.isEmpty
              ? Text('No reviews yet.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textTertiary))
              : Column(
                  children: [for (final r in list.take(4)) _ReviewCard(review: r)],
                ),
        ),
      ],
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});
  final Review review;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(review.author, style: textTheme.titleSmall),
              const Spacer(),
              RatingPill(rating: review.rating, compact: true),
            ],
          ),
          const SizedBox(height: 6),
          Text(review.comment,
              style: textTheme.bodySmall?.copyWith(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _SimilarSection extends ConsumerWidget {
  const _SimilarSection({required this.movieId});
  final String movieId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final similar = ref.watch(similarMoviesProvider(movieId));
    return similar.maybeWhen(
      data: (movies) => movies.isEmpty
          ? const SizedBox.shrink()
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'More like this'),
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  height: 208,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: movies.length,
                    separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
                    itemBuilder: (context, i) => MovieCard(
                      movie: movies[i],
                      width: 116,
                      onTap: () => context.push('/movies/${movies[i].id}'),
                    ),
                  ),
                ),
              ],
            ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.zero,
      children: const [
        Skeleton(height: 420, radius: 0),
        Padding(
          padding: EdgeInsets.all(AppSpacing.screen),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Skeleton(height: 18, width: 140),
              SizedBox(height: 12),
              Skeleton(height: 12, width: double.infinity),
              SizedBox(height: 8),
              Skeleton(height: 12, width: double.infinity),
              SizedBox(height: 8),
              Skeleton(height: 12, width: 200),
            ],
          ),
        ),
      ],
    );
  }
}
