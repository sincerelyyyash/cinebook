import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_dimens.dart';
import 'skeleton.dart';

/// Network image with a graceful lifecycle: shimmer while loading, a tasteful
/// monochrome fallback (initials over a dark gradient) on error/missing URL,
/// and a soft fade-in once decoded.
class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    super.key,
    required this.url,
    this.fallbackText,
    this.fit = BoxFit.cover,
    this.radius = 0,
  });

  final String? url;
  final String? fallbackText;
  final BoxFit fit;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final child = (url == null || url!.isEmpty)
        ? _fallback(context)
        : Image.network(
            url!,
            fit: fit,
            gaplessPlayback: true,
            // Some CDNs (e.g. Wikimedia) reject an empty User-Agent — send one.
            headers: const {'User-Agent': 'CineBook/1.0 (Flutter)'},
            loadingBuilder: (context, image, progress) {
              if (progress == null) {
                return AnimatedSwitcher(
                  duration: AppMotion.slow,
                  child: image,
                );
              }
              return const Skeleton(height: double.infinity, radius: 0);
            },
            errorBuilder: (context, _, __) => _fallback(context),
          );

    return radius > 0
        ? ClipRRect(borderRadius: BorderRadius.circular(radius), child: child)
        : child;
  }

  Widget _fallback(BuildContext context) {
    final initials = (fallbackText ?? '?').trim();
    final label = initials.isEmpty ? '?' : initials;
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: AppColors.surfaceSheen),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Icon(PhosphorIconsRegular.filmStrip,
              color: AppColors.textTertiary,
              size: 28,
              semanticLabel: label),
        ),
      ),
    );
  }
}
