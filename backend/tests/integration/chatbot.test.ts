import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupFixture, teardownFixture, type Fixture } from './fixtures.ts';
import { setProvider } from '../../src/chatbot/llm/provider.ts';
import { handleChat } from '../../src/chatbot/chatbot.service.ts';
import { prisma } from '../../src/infra/prisma.ts';
import type { ChatMessage, LLMProvider } from '../../src/chatbot/llm/types.ts';

let f: Fixture;
let movieTitle: string;

/**
 * Scripted provider that reads real tool results and chains ids — proving the
 * agent loop, sub-agent delegation, action chaining, and cross-turn memory
 * against the real services (no live LLM needed).
 */
function makeProvider(): LLMProvider {
  const call = (name: string, args: object, i = 1): ChatMessage => ({
    role: 'assistant',
    content: null,
    tool_calls: [{ id: `c${i}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  });
  const text = (t: string): ChatMessage => ({ role: 'assistant', content: t });

  return {
    complete: async () => 'summary',
    chat: async (messages: ChatMessage[]): Promise<ChatMessage> => {
      const sys = messages[0]?.content ?? '';
      const isSub = sys.includes('booking specialist');
      const toolMsgs = messages.filter((m) => m.role === 'tool');
      const has = (n: string) => toolMsgs.some((m) => m.name === n);
      const res = (n: string): any => {
        const m = [...toolMsgs].reverse().find((x) => x.name === n);
        return m ? JSON.parse(m.content as string) : null;
      };
      const blob = JSON.stringify(messages);

      if (isSub) {
        if (!has('search_movies')) return call('search_movies', { query: movieTitle });
        if (!has('get_showtimes')) return call('get_showtimes', { movieId: res('search_movies').data[0].id });
        if (!has('check_seat_availability')) {
          const st = res('get_showtimes');
          return call('check_seat_availability', { showId: st.theatres[0].dates[0].shows[0].showId });
        }
        if (!has('hold_seats')) {
          const av = res('check_seat_availability');
          const seatIds = av.byCategory.STANDARD.sample.slice(0, 2).map((s: any) => s.id);
          return call('hold_seats', { showId: av.showId, seatIds });
        }
        const h = res('hold_seats');
        return text(`Held ${h.seats.map((s: any) => s.label).join(', ')}. holdId=${h.id}`);
      }

      // orchestrator
      const holdMatch = blob.match(/holdId=(h_[A-Za-z0-9_-]+)/);
      if (!has('delegate_booking') && !has('create_booking')) {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
        if (/pay|yes/i.test(lastUser) && holdMatch) return call('create_booking', { holdId: holdMatch[1] });
        return call('delegate_booking', { task: `Book 2 standard seats for ${movieTitle}` });
      }
      if (has('delegate_booking') && !has('create_booking')) return text(res('delegate_booking').summary);
      if (has('create_booking') && !has('start_payment')) return call('start_payment', { bookingId: res('create_booking').id });
      if (has('start_payment') && !has('confirm_payment')) {
        return call('confirm_payment', { bookingId: res('create_booking').id, cardNumber: '4111111111111111' });
      }
      const c = res('confirm_payment');
      return text(`Done! ${c.booking.code} is ${c.booking.status}.`);
    },
  };
}

beforeAll(async () => {
  f = await setupFixture();
  movieTitle = `Test Movie ${f.id}`;
  setProvider(makeProvider());
});
afterAll(async () => {
  await teardownFixture(f);
});

describe('chatbot end-to-end (scripted provider)', () => {
  it('delegates, chains actions, remembers across turns, and completes a paid booking', async () => {
    const t1 = await handleChat(f.customerId, undefined, `Book ${movieTitle}, 2 standard seats`);
    expect(t1.reply).toMatch(/holdId=h_/); // sub-agent held seats and reported back

    const t2 = await handleChat(f.customerId, t1.conversationId, 'Yes, pay with 4111111111111111');
    expect(t2.reply).toMatch(/CONFIRMED/);

    // verify in the DB
    const booking = await prisma.booking.findFirst({
      where: { userId: f.customerId, showId: f.showId },
      include: { payment: true, seats: true },
    });
    expect(booking?.status).toBe('CONFIRMED');
    expect(booking?.payment?.status).toBe('SUCCEEDED');
    expect(booking?.seats.length).toBe(2);

    // the conversation persisted both turns
    const messages = await prisma.message.count({ where: { conversationId: t1.conversationId } });
    expect(messages).toBe(4); // 2 user + 2 assistant
  }, 25000);
});
