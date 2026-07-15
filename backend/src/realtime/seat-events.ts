import { EventEmitter } from 'node:events';

/**
 * Decouples booking/hold services from the WebSocket layer. Services call
 * `emitSeatUpdate(showId)` after any change to seat state (hold, release,
 * book, cancel, expiry); the WS layer subscribes and pushes fresh
 * availability to interested clients. No service imports the WS server.
 */
export const seatEvents = new EventEmitter();

export function emitSeatUpdate(showId: string): void {
  seatEvents.emit('update', showId);
}

export function onSeatUpdate(handler: (showId: string) => void): () => void {
  seatEvents.on('update', handler);
  return () => seatEvents.off('update', handler);
}
