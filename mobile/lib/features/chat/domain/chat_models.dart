/// Chat domain models. Kept as hand-written classes (no json codegen) because
/// the streaming events are a small sealed hierarchy that reads more clearly
/// spelled out than generated.

/// A conversation in the history list (`GET /chat/conversations`).
class ConversationSummary {
  const ConversationSummary({
    required this.id,
    this.title,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String? title;
  final String createdAt;
  final String updatedAt;

  factory ConversationSummary.fromJson(Map<String, dynamic> j) => ConversationSummary(
        id: j['id'] as String,
        title: j['title'] as String?,
        createdAt: j['createdAt'] as String,
        updatedAt: j['updatedAt'] as String,
      );
}

/// A persisted message (user/assistant text only — tool steps aren't stored).
class StoredMessage {
  const StoredMessage({required this.role, required this.text, required this.at});

  final String role; // 'user' | 'assistant'
  final String text;
  final String at;

  factory StoredMessage.fromJson(Map<String, dynamic> j) => StoredMessage(
        role: j['role'] as String,
        text: j['text'] as String,
        at: j['at'] as String,
      );
}

class ConversationDetail {
  const ConversationDetail({
    required this.id,
    this.title,
    required this.createdAt,
    required this.messages,
  });

  final String id;
  final String? title;
  final String createdAt;
  final List<StoredMessage> messages;

  factory ConversationDetail.fromJson(Map<String, dynamic> j) => ConversationDetail(
        id: j['id'] as String,
        title: j['title'] as String?,
        createdAt: j['createdAt'] as String,
        messages: (j['messages'] as List? ?? const [])
            .map((e) => StoredMessage.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

/* ── Streaming events (SSE from POST /chat) ─────────────────────────────────── */

/// Backend SSE event types:
///   tool_start {tool}, tool_end {tool, ok},
///   conversation {conversationId}, token {text},
///   done {conversationId}, error {message}
sealed class ChatEvent {
  const ChatEvent();

  /// Parse one decoded SSE payload into a typed event (or null if unknown).
  static ChatEvent? fromJson(Map<String, dynamic> j) {
    switch (j['type']) {
      case 'tool_start':
        return ToolStartEvent(j['tool'] as String? ?? 'tool');
      case 'tool_end':
        return ToolEndEvent(j['tool'] as String? ?? 'tool', j['ok'] as bool? ?? true);
      case 'conversation':
        return ConversationEvent(j['conversationId'] as String);
      case 'token':
        return TokenEvent(j['text'] as String? ?? '');
      case 'done':
        return DoneEvent(j['conversationId'] as String?);
      case 'error':
        return ErrorEvent(j['message'] as String? ?? 'Something went wrong.');
      default:
        return null;
    }
  }
}

class ToolStartEvent extends ChatEvent {
  const ToolStartEvent(this.tool);
  final String tool;
}

class ToolEndEvent extends ChatEvent {
  const ToolEndEvent(this.tool, this.ok);
  final String tool;
  final bool ok;
}

class ConversationEvent extends ChatEvent {
  const ConversationEvent(this.conversationId);
  final String conversationId;
}

class TokenEvent extends ChatEvent {
  const TokenEvent(this.text);
  final String text;
}

class DoneEvent extends ChatEvent {
  const DoneEvent(this.conversationId);
  final String? conversationId;
}

class ErrorEvent extends ChatEvent {
  const ErrorEvent(this.message);
  final String message;
}

/* ── In-memory chat transcript model ────────────────────────────────────────── */

enum ChatRole { user, assistant }

/// A tool step surfaced live under a streaming assistant turn (tool chips).
class ToolStep {
  const ToolStep({required this.tool, this.running = true, this.ok = true});
  final String tool;
  final bool running;
  final bool ok;

  ToolStep copyWith({bool? running, bool? ok}) =>
      ToolStep(tool: tool, running: running ?? this.running, ok: ok ?? this.ok);
}

/// One bubble in the transcript. Assistant messages carry the tool steps taken
/// while producing them and a `streaming` flag during generation.
class ChatMessage {
  const ChatMessage({
    required this.role,
    required this.text,
    this.tools = const [],
    this.streaming = false,
    this.at,
  });

  final ChatRole role;
  final String text;
  final List<ToolStep> tools;
  final bool streaming;

  /// When the turn was created/received (local time). Null for history rows
  /// without a parseable timestamp.
  final DateTime? at;

  bool get isUser => role == ChatRole.user;

  /// The label of the tool currently running (for the live status line), or the
  /// last completed one. Null when no tools have run.
  ToolStep? get activeTool {
    for (final t in tools.reversed) {
      if (t.running) return t;
    }
    return tools.isNotEmpty ? tools.last : null;
  }

  ChatMessage copyWith({String? text, List<ToolStep>? tools, bool? streaming, DateTime? at}) =>
      ChatMessage(
        role: role,
        text: text ?? this.text,
        tools: tools ?? this.tools,
        streaming: streaming ?? this.streaming,
        at: at ?? this.at,
      );
}
