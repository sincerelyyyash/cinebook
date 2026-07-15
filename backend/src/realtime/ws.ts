import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { onSeatUpdate } from './seat-events.ts';
import { getShowAvailability } from '../services/availability.service.ts';
import { childLogger } from '../lib/logger.ts';

const log = childLogger('ws');

/**
 * Live seat-availability over WebSocket (assignment: "updates in real-time").
 *
 * Protocol (JSON):
 *   client → { action: "subscribe",   showId }
 *   client → { action: "unsubscribe", showId }
 *   server → { type: "availability", showId, summary, seats }
 *
 * When any seat state changes, services emit a seat-update event; we recompute
 * availability once per show and fan it out to that show's subscribers.
 */
const rooms = new Map<string, Set<WebSocket>>();

function subscribe(ws: WebSocket, showId: string) {
  let room = rooms.get(showId);
  if (!room) {
    room = new Set();
    rooms.set(showId, room);
  }
  room.add(ws);
}

function unsubscribe(ws: WebSocket, showId: string) {
  rooms.get(showId)?.delete(ws);
}

function forget(ws: WebSocket) {
  for (const room of rooms.values()) room.delete(ws);
}

async function broadcastAvailability(showId: string) {
  const room = rooms.get(showId);
  if (!room || room.size === 0) return;
  try {
    const availability = await getShowAvailability(showId);
    const payload = JSON.stringify({
      type: 'availability',
      showId,
      summary: availability.summary,
      seats: availability.seats.map((s) => ({ id: s.id, status: s.status })),
    });
    for (const ws of room) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  } catch (err) {
    log.error({ err: (err as Error).message, showId }, 'failed to broadcast availability');
  }
}

export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (raw) => {
      let msg: { action?: string; showId?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }
      if (!msg.showId) return;

      if (msg.action === 'subscribe') {
        subscribe(ws, msg.showId);
        // send an immediate snapshot
        try {
          const availability = await getShowAvailability(msg.showId);
          ws.send(
            JSON.stringify({
              type: 'availability',
              showId: msg.showId,
              summary: availability.summary,
              seats: availability.seats.map((s) => ({ id: s.id, status: s.status })),
            }),
          );
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown show' }));
        }
      } else if (msg.action === 'unsubscribe') {
        unsubscribe(ws, msg.showId);
      }
    });

    ws.on('close', () => forget(ws));
    ws.on('error', () => forget(ws));
  });

  // Fan out seat changes emitted by services.
  onSeatUpdate((showId) => void broadcastAvailability(showId));

  log.info('🔌 WebSocket server attached at /ws');
  return wss;
}
