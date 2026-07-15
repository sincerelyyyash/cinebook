import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';

import '../../../../core/domain/enums.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../shared/ui/network_image.dart';
import '../../../../shared/ui/pills.dart';
import '../../../../shared/ui/press_scale.dart';
import '../../domain/movie.dart';

/// Poster card for grids and rails. Rounded artwork with a rating pill overlay,
/// a Hero for the detail transition, and press-scale feedback.
class MovieCard extends StatelessWidget {
  const MovieCard({super.key, required this.movie, required this.onTap, this.width});

  final MovieSummary movie;
  final VoidCallback onTap;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return PressScale(
      onTap: onTap,
      scale: 0.97,
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 2 / 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Hero(
                    tag: 'poster-${movie.id}',
                    child: AppNetworkImage(
                      url: movie.posterUrl,
                      fallbackText: movie.title,
                      radius: AppRadius.lg,
                    ),
                  ),
                  if (movie.rating.count > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: RatingPill(rating: movie.rating.average, compact: true),
                    ),
                  if (movie.isTrending)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.overlay,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(PhosphorIconsRegular.trendUp, size: 12, color: AppColors.textPrimary),
                            const SizedBox(width: 3),
                            Text('Hot',
                                style: textTheme.labelSmall
                                    ?.copyWith(color: AppColors.textPrimary, fontSize: 10)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              movie.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.titleSmall,
            ),
            const SizedBox(height: 2),
            Text(
              '${movie.genres.take(2).join(' · ')}${movie.genres.isEmpty ? '' : ' · '}${movie.ageRating.label}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary),
            ),
          ],
        ),
      ),
    );
  }
}
