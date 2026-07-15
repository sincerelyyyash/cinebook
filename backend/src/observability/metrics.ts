import client from 'prom-client';

/**
 * Prometheus metrics (§3.1 "Key Metrics"). Exposed at GET /metrics.
 * Captures request throughput + latency (to spot slowdowns) and error rates by
 * type. Domain events (bookings, payments, chatbot tools) increment counters
 * from their services.
 */
export const register = new client.Registry();
register.setDefaultLabels({ service: 'cinebook-backend' });
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [register],
});

export const errorsTotal = new client.Counter({
  name: 'app_errors_total',
  help: 'Application errors by code',
  labelNames: ['code'] as const,
  registers: [register],
});

export const paymentsTotal = new client.Counter({
  name: 'payments_total',
  help: 'Payment outcomes',
  labelNames: ['outcome'] as const, // succeeded | declined | failed | unavailable
  registers: [register],
});

export const bookingsTotal = new client.Counter({
  name: 'bookings_total',
  help: 'Booking lifecycle events',
  labelNames: ['event'] as const, // created | confirmed | cancelled | expired | refunded
  registers: [register],
});

export const chatbotToolCalls = new client.Counter({
  name: 'chatbot_tool_calls_total',
  help: 'Chatbot tool invocations',
  labelNames: ['tool', 'success'] as const,
  registers: [register],
});

/** §3.1 "how long typical conversations are" — messages per conversation, sampled each turn. */
export const chatbotConversationMessages = new client.Histogram({
  name: 'chatbot_conversation_messages',
  help: 'Total messages in a conversation (observed at the end of each turn)',
  buckets: [2, 4, 8, 16, 32, 64, 128],
  registers: [register],
});

/** Tool calls used within a single chat turn (engagement / action-chaining depth). */
export const chatbotTurnToolCalls = new client.Histogram({
  name: 'chatbot_turn_tool_calls',
  help: 'Number of tool calls made in one chat turn',
  buckets: [0, 1, 2, 3, 5, 8, 13, 21],
  registers: [register],
});

/**
 * Collapse dynamic path segments (ids) into `:id` so metric label cardinality
 * stays bounded. Handles cuid, our `h_…` hold ids, and long tokens.
 */
export function normalizeRoute(path: string): string {
  return (
    path
      .split('/')
      .map((seg) => {
        if (!seg) return seg;
        if (/^c[a-z0-9]{20,}$/i.test(seg)) return ':id'; // cuid
        if (/^h_/.test(seg)) return ':id'; // hold id
        if (/^txn_/.test(seg)) return ':id';
        if (/^CB-/.test(seg)) return ':code';
        if (/^\d+$/.test(seg)) return ':n';
        return seg;
      })
      .join('/') || '/'
  );
}
