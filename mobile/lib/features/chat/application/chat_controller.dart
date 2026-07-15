import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../data/chat_repository.dart';
import '../domain/chat_models.dart';

class ChatState {
  const ChatState({
    this.messages = const [],
    this.conversationId,
    this.sending = false,
    this.error,
  });

  final List<ChatMessage> messages;
  final String? conversationId;
  final bool sending;
  final String? error;

  ChatState copyWith({
    List<ChatMessage>? messages,
    String? conversationId,
    bool? sending,
    String? error,
    bool clearError = false,
  }) =>
      ChatState(
        messages: messages ?? this.messages,
        conversationId: conversationId ?? this.conversationId,
        sending: sending ?? this.sending,
        error: clearError ? null : (error ?? this.error),
      );
}

/// Drives one chat session: sends a turn over SSE and folds the streamed
/// events (tool activity → tokens → done) into the transcript in real time.
/// Mirrors the backend's custom agent loop from the client side — tool chips
/// (including `delegate_booking`) surface the sub-agent delegation.
class ChatController extends AutoDisposeNotifier<ChatState> {
  StreamSubscription<ChatEvent>? _sub;
  CancelToken? _cancel;

  @override
  ChatState build() {
    ref.onDispose(() {
      _sub?.cancel();
      _cancel?.cancel();
    });
    return const ChatState();
  }

  /// Load an existing conversation into the transcript (resume).
  Future<void> loadConversation(String id) async {
    state = const ChatState(sending: true);
    try {
      final detail = await ref.read(chatRepositoryProvider).getConversation(id);
      state = ChatState(
        conversationId: id,
        messages: detail.messages
            .map((m) => ChatMessage(
                  role: m.role == 'user' ? ChatRole.user : ChatRole.assistant,
                  text: m.text,
                  at: DateTime.tryParse(m.at)?.toLocal(),
                ))
            .toList(),
      );
    } on ApiException catch (e) {
      state = ChatState(error: e.message);
    }
  }

  void startNewConversation() {
    _sub?.cancel();
    _cancel?.cancel();
    state = const ChatState();
  }

  Future<void> send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || state.sending) return;

    // Append the user turn + an empty streaming assistant turn.
    final messages = [
      ...state.messages,
      ChatMessage(role: ChatRole.user, text: trimmed, at: DateTime.now()),
      ChatMessage(role: ChatRole.assistant, text: '', streaming: true, at: DateTime.now()),
    ];
    state = state.copyWith(messages: messages, sending: true, clearError: true);

    _cancel = CancelToken();
    final stream = ref.read(chatRepositoryProvider).send(
          trimmed,
          conversationId: state.conversationId,
          cancelToken: _cancel,
        );

    final completer = Completer<void>();
    _sub = stream.listen(
      _onEvent,
      onError: (Object err) {
        _failLast(err is ApiException ? err.message : 'Chat failed. Please try again.');
        if (!completer.isCompleted) completer.complete();
      },
      onDone: () {
        _finishLast();
        if (!completer.isCompleted) completer.complete();
      },
      cancelOnError: true,
    );

    await completer.future;
    state = state.copyWith(sending: false);
  }

  /// Stop an in-flight generation.
  void stop() {
    _cancel?.cancel('stopped');
    _sub?.cancel();
    _finishLast();
    state = state.copyWith(sending: false);
  }

  /* ── Event folding ─────────────────────────────────────────────────────────── */

  void _onEvent(ChatEvent event) {
    switch (event) {
      case ToolStartEvent(:final tool):
        _mutateLast((m) => m.copyWith(tools: [...m.tools, ToolStep(tool: tool)]));
      case ToolEndEvent(:final tool, :final ok):
        _mutateLast((m) {
          final tools = [...m.tools];
          final idx = tools.lastIndexWhere((t) => t.tool == tool && t.running);
          if (idx != -1) tools[idx] = tools[idx].copyWith(running: false, ok: ok);
          return m.copyWith(tools: tools);
        });
      case ConversationEvent(:final conversationId):
        state = state.copyWith(conversationId: conversationId);
      case TokenEvent(:final text):
        _mutateLast((m) => m.copyWith(text: m.text + text));
      case DoneEvent(:final conversationId):
        if (conversationId != null) state = state.copyWith(conversationId: conversationId);
        _finishLast();
      case ErrorEvent(:final message):
        _failLast(message);
    }
  }

  void _mutateLast(ChatMessage Function(ChatMessage) transform) {
    final messages = [...state.messages];
    if (messages.isEmpty) return;
    messages[messages.length - 1] = transform(messages.last);
    state = state.copyWith(messages: messages);
  }

  void _finishLast() {
    _mutateLast((m) => m.copyWith(streaming: false));
  }

  void _failLast(String message) {
    _mutateLast((m) => m.copyWith(
          streaming: false,
          text: m.text.isEmpty ? '⚠️ $message' : m.text,
        ));
    state = state.copyWith(error: message);
  }
}

final chatControllerProvider =
    AutoDisposeNotifierProvider<ChatController, ChatState>(ChatController.new);

/// Conversation history list for the drawer/history screen.
final conversationsProvider =
    FutureProvider.autoDispose<List<ConversationSummary>>((ref) {
  return ref.watch(chatRepositoryProvider).listConversations();
});
