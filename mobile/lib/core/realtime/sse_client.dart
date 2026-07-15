import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import '../network/api_exception.dart';

/// Minimal Server-Sent-Events client over Dio, used for the chat stream
/// (`POST /api/chat` with `stream:true`). Yields each event's decoded JSON
/// payload as it arrives.
///
/// It reuses the shared Dio instance, so the auth interceptor attaches the
/// bearer token and the base URL is applied automatically. Cancellation is
/// cooperative via [CancelToken].
///
/// Wire format (one event per blank-line-delimited block):
/// ```
/// data: {"type":"token","text":"He"}
///
/// data: {"type":"done","conversationId":"..."}
/// ```
Stream<Map<String, dynamic>> postSse(
  Dio dio,
  String path, {
  required Object body,
  CancelToken? cancelToken,
}) async* {
  final Response<ResponseBody> res;
  try {
    res = await dio.post<ResponseBody>(
      path,
      data: body,
      options: Options(
        responseType: ResponseType.stream,
        headers: {'Accept': 'text/event-stream'},
      ),
      cancelToken: cancelToken,
    );
  } on DioException catch (e) {
    throw ApiException.fromDio(e);
  }

  final stream = res.data!.stream
      .cast<List<int>>()
      .transform(utf8.decoder)
      .transform(const LineSplitter());

  final dataLines = <String>[];

  Map<String, dynamic>? flush() {
    if (dataLines.isEmpty) return null;
    final payload = dataLines.join('\n');
    dataLines.clear();
    if (payload == '[DONE]') return null;
    try {
      final decoded = jsonDecode(payload);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return null;
    }
  }

  await for (final line in stream) {
    if (line.isEmpty) {
      final event = flush();
      if (event != null) yield event;
      continue;
    }
    if (line.startsWith(':')) continue; // SSE comment / heartbeat
    if (line.startsWith('data:')) {
      dataLines.add(line.substring(5).trimLeft());
    }
    // `event:` / `id:` fields are unused by this backend.
  }

  // Flush a trailing event with no closing blank line.
  final tail = flush();
  if (tail != null) yield tail;
}
