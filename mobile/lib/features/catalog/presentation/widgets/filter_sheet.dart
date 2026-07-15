import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/domain/enums.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../shared/ui/app_button.dart';
import '../../../../shared/ui/category_chip.dart';
import '../../application/catalog_controllers.dart';
import '../../domain/movie_filters.dart';

/// Bottom-sheet filter editor (§1.2). Edits a local draft and commits it to
/// [moviesFilterProvider] on apply.
class FilterSheet extends ConsumerStatefulWidget {
  const FilterSheet({super.key});

  static Future<void> show(BuildContext context) => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (_) => const FilterSheet(),
      );

  @override
  ConsumerState<FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends ConsumerState<FilterSheet> {
  late MovieFilters _draft;

  @override
  void initState() {
    super.initState();
    _draft = ref.read(moviesFilterProvider);
  }

  @override
  Widget build(BuildContext context) {
    final genresAsync = ref.watch(genresProvider);
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.screen,
        right: AppSpacing.screen,
        top: AppSpacing.xs,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Filters', style: Theme.of(context).textTheme.titleLarge),
                const Spacer(),
                if (_draft.activeCount > 0)
                  TextButton(
                    onPressed: () => setState(() => _draft = const MovieFilters()),
                    child: const Text('Clear all'),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            genresAsync.maybeWhen(
              data: (genres) => _Group(
                label: 'Genre',
                child: Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: [
                    for (final g in genres)
                      CategoryChip(
                        label: g.name,
                        selected: _draft.genre == g.name,
                        onTap: () => setState(() => _draft = _draft.copyWith(
                              genre: g.name,
                              clearGenre: _draft.genre == g.name,
                            )),
                      ),
                  ],
                ),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
            _Group(
              label: 'Screen type',
              child: Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: [
                  for (final t in ScreenType.values)
                    CategoryChip(
                      label: t.label,
                      selected: _draft.screenType == t,
                      onTap: () => setState(() => _draft = _draft.copyWith(
                            screenType: t,
                            clearScreenType: _draft.screenType == t,
                          )),
                    ),
                ],
              ),
            ),
            _Group(
              label: 'Format',
              child: Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: [
                  for (final f in Format.values)
                    CategoryChip(
                      label: f.label,
                      selected: _draft.format == f,
                      onTap: () => setState(() => _draft = _draft.copyWith(
                            format: f,
                            clearFormat: _draft.format == f,
                          )),
                    ),
                ],
              ),
            ),
            _Group(
              label: 'Age rating',
              child: Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: [
                  for (final r in AgeRating.values)
                    CategoryChip(
                      label: r.label,
                      selected: _draft.ageRating == r,
                      onTap: () => setState(() => _draft = _draft.copyWith(
                            ageRating: r,
                            clearAgeRating: _draft.ageRating == r,
                          )),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AppButton(
              label: 'Show results',
              onPressed: () {
                ref.read(moviesFilterProvider.notifier).state = _draft;
                Navigator.of(context).pop();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .labelLarge
                  ?.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: AppSpacing.sm),
          child,
        ],
      ),
    );
  }
}
