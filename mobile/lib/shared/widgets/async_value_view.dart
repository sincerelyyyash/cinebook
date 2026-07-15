import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../ui/error_state.dart';

/// Renders an [AsyncValue] with consistent loading / error / data states.
/// Keeps screens free of repetitive `.when(...)` boilerplate and routes
/// [ApiException]s through the shared [ErrorState] (with retry).
class AsyncValueView<T> extends StatelessWidget {
  const AsyncValueView({
    super.key,
    required this.value,
    required this.data,
    this.onRetry,
    this.loading,
    this.skipLoadingOnRefresh = true,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback? onRetry;
  final Widget? loading;
  final bool skipLoadingOnRefresh;

  @override
  Widget build(BuildContext context) {
    return value.when(
      skipLoadingOnRefresh: skipLoadingOnRefresh,
      skipLoadingOnReload: skipLoadingOnRefresh,
      data: data,
      loading: () => loading ?? const Center(child: CircularProgressIndicator()),
      error: (err, _) => ErrorState(
        message: err is ApiException ? err.message : 'Something went wrong.',
        onRetry: onRetry,
      ),
    );
  }
}
