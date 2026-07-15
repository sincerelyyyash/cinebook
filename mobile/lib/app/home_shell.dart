import 'package:flutter/material.dart';
import 'package:cinebook/core/theme/app_icons.dart';

import '../core/ui/haptics.dart';
import '../features/bookings/presentation/bookings_screen.dart';
import '../features/catalog/presentation/movies_screen.dart';
import '../features/chat/presentation/chat_screen.dart';
import '../features/profile/presentation/profile_screen.dart';

/// Authenticated app shell: bottom-nav across the four customer surfaces. Tab
/// state is preserved via an [IndexedStack]; switching gives a selection haptic.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _tabs = [
    MoviesScreen(),
    BookingsScreen(),
    ChatScreen(),
    ProfileScreen(),
  ];

  void _onSelect(int i) {
    if (i == _index) return;
    Haptics.selection();
    setState(() => _index = i);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _onSelect,
        destinations: const [
          NavigationDestination(
              icon: Icon(PhosphorIconsRegular.filmStrip), selectedIcon: Icon(PhosphorIconsFill.filmStrip), label: 'Movies'),
          NavigationDestination(
              icon: Icon(PhosphorIconsRegular.ticket),
              selectedIcon: Icon(PhosphorIconsFill.ticket),
              label: 'Bookings'),
          NavigationDestination(
              icon: Icon(PhosphorIconsRegular.sparkle),
              selectedIcon: Icon(PhosphorIconsFill.sparkle),
              label: 'Assistant'),
          NavigationDestination(
              icon: Icon(PhosphorIconsRegular.user),
              selectedIcon: Icon(PhosphorIconsFill.user),
              label: 'Account'),
        ],
      ),
    );
  }
}
