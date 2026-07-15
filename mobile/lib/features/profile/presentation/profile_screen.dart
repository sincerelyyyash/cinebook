import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimens.dart';
import '../../../shared/ui/press_scale.dart';
import '../../auth/application/session_controller.dart';

/// Account tab: identity, preferences, and sign out.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
        titleTextStyle: textTheme.headlineSmall,
        toolbarHeight: 64,
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.screen),
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    gradient: AppColors.surfaceSheen,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        height: 60,
                        width: 60,
                        decoration: const BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          user.name.isNotEmpty ? user.name.characters.first.toUpperCase() : '?',
                          style: textTheme.headlineSmall?.copyWith(color: AppColors.onPrimary),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.name, style: textTheme.titleLarge),
                            if (user.phoneNumber != null)
                              Text(user.phoneNumber!,
                                  style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.05, end: 0),
                const SizedBox(height: AppSpacing.lg),
                _Tile(icon: PhosphorIconsRegular.envelope, label: 'Email', value: user.email),
                _Tile(icon: PhosphorIconsRegular.identificationBadge, label: 'Role', value: _roleLabel(user.role.name)),
                if (user.preferences != null && user.preferences!.isNotEmpty)
                  _Tile(
                    icon: PhosphorIconsRegular.slidersHorizontal,
                    label: 'Preferences',
                    value: user.preferences!.entries.map((e) => '${e.key}: ${e.value}').join(' · '),
                  ),
                const SizedBox(height: AppSpacing.lg),
                PressScale(
                  onTap: () => _confirmLogout(context, ref),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(PhosphorIconsRegular.signOut, size: 20, color: AppColors.error),
                        const SizedBox(width: AppSpacing.sm),
                        Text('Sign out',
                            style: textTheme.titleSmall?.copyWith(color: AppColors.error)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                Center(
                  child: Text('CineBook · v1.0.0',
                      style: textTheme.labelSmall?.copyWith(color: AppColors.textTertiary)),
                ),
              ],
            ),
    );
  }

  String _roleLabel(String role) => switch (role) {
        'customer' => 'Customer',
        'hallManager' => 'Hall Manager',
        'admin' => 'Admin',
        _ => role,
      };

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You’ll need to verify your phone again to sign back in.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign out', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(sessionControllerProvider.notifier).logout();
    }
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textSecondary),
          const SizedBox(width: AppSpacing.md),
          Text(label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textTertiary)),
          const Spacer(),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.right,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
