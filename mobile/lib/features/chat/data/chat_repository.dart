import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/realtime/sse_client.dart';
import '../domain/chat_models.dart';

/// Chat transport. Streaming replies come over SSE (`POST /chat`, `stream:true`);
/// conversation history is plain REST.
class ChatRepository {
  ChatRepository(this._client, this._dio);

  final ApiClient _client;
  final Dio _dio;

  /// Stream a chat turn. Yields typed [ChatEvent]s (tool activity, tokens,
  /// conversation id, done/error) as they arrive.
  Stream<ChatEvent> send(
    String message, {
    String? conversationId,
    CancelToken? cancelToken,
  }) async* {
    final body = {
      'message': message,
      if (conversationId != null) 'conversationId': conversationId,
      'stream': true,
    };
    await for (final raw in postSse(_dio, '/chat', body: body, cancelToken: cancelToken)) {
      final event = ChatEvent.fromJson(raw);
      if (event != null) yield event;
    }
  }

  Future<List<ConversationSummary>> listConversations() {
    return _client.get<List<ConversationSummary>>(
      '/chat/conversations',
      decode: (d) => (d as List)
          .map((e) => ConversationSummary.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }

  Future<ConversationDetail> getConversation(String id) {
    return _client.get<ConversationDetail>(
      '/chat/conversations/$id',
      decode: (d) => ConversationDetail.fromJson((d as Map).cast<String, dynamic>()),
    );
  }
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(ref.watch(apiClientProvider), ref.watch(dioProvider));
});
