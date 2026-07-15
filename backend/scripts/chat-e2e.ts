/**
 * End-to-end chatbot verification using a SCRIPTED LLM provider (no real key).
 * The fake reads real tool results and chains ids exactly as a model would —
 * proving the agent loop, sub-agent delegation, action chaining, cross-turn
 * memory, promo + payment all work against the real services. Swapping in
 * OpenRouter is a one-line change (remove setProvider).
 */
import { setProvider } from '../src/chatbot/llm/provider.ts';
import { handleChat } from '../src/chatbot/chatbot.service.ts';
import { prisma } from '../src/infra/prisma.ts';
import type { ChatMessage, LLMProvider, ToolSpec } from '../src/chatbot/llm/types.ts';

let callId = 0;
const call = (name: string, args: object): ChatMessage => ({
  role: 'assistant',
  content: null,
  tool_calls: [{ id: `c${++callId}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
});
const text = (t: string): ChatMessage => ({ role: 'assistant', content: t });

const fake: LLMProvider = {
  async complete() {
    return 'Customer is booking Inception in Bangalore; 2 standard seats held.';
  },
  async chat(messages: ChatMessage[], _tools?: ToolSpec[]): Promise<ChatMessage> {
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
      if (!has('search_movies')) return call('search_movies', { query: 'Inception' });
      if (!has('get_showtimes')) return call('get_showtimes', { movieId: res('search_movies').data[0].id, city: 'Bangalore' });
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
      return text(`Held ${h.seats.map((s: any) => s.label).join(', ')} for ₹${h.subtotal / 100}. holdId=${h.id}`);
    }

    // Orchestrator
    if (!has('delegate_booking') && !has('create_booking')) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      const holdMatch = blob.match(/holdId=(h_[A-Za-z0-9_-]+)/);
      if (/pay|confirm|proceed|yes/i.test(lastUser) && holdMatch) {
        return call('create_booking', { holdId: holdMatch[1], promoCode: 'WELCOME50' });
      }
      return call('delegate_booking', { task: 'Book 2 STANDARD seats for Inception in Bangalore this week' });
    }
    if (has('delegate_booking') && !has('create_booking')) {
      return text(`${res('delegate_booking').summary}\n\nShall I apply a promo and take payment?`);
    }
    if (has('create_booking') && !has('start_payment')) return call('start_payment', { bookingId: res('create_booking').id });
    if (has('start_payment') && !has('confirm_payment')) {
      return call('confirm_payment', { bookingId: res('create_booking').id, cardNumber: '4111111111111111' });
    }
    if (has('confirm_payment')) {
      const c = res('confirm_payment');
      return text(`All done! Booking ${c.booking.code} is ${c.booking.status} — total ₹${c.booking.total / 100}. Enjoy Inception! 🎬`);
    }
    return text('How else can I help?');
  },
};

setProvider(fake);

const log = (e: any) => console.log(`   · tool ${e.type === 'tool_start' ? '▶' : '✓'} ${e.tool}${e.ok === false ? ' (error)' : ''}`);

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'CUSTOMER' }, select: { id: true, name: true } });
  if (!user) throw new Error('no customer');
  console.log(`\n👤 ${user.name}\n`);

  console.log('TURN 1 — "Book Inception in Bangalore, 2 standard seats"');
  const t1 = await handleChat(user.id, undefined, 'Book Inception in Bangalore, 2 standard seats please', log);
  console.log(`🤖 ${t1.reply}\n`);

  console.log('TURN 2 — "Yes, apply WELCOME50 and pay with 4111 1111 1111 1111"');
  const t2 = await handleChat(user.id, t1.conversationId, 'Yes, apply WELCOME50 and pay with 4111111111111111', log);
  console.log(`🤖 ${t2.reply}\n`);

  // Verify in DB
  const code = t2.reply.match(/CB-[A-Z0-9]+/)?.[0];
  const booking = code ? await prisma.booking.findUnique({ where: { code }, include: { payment: true, seats: true } }) : null;
  console.log('VERIFY:', booking
    ? { code, status: booking.status, seats: booking.seats.length, total: booking.total, payment: booking.payment?.status, discount: booking.discount }
    : 'no booking found');

  const toolLog = await prisma.activityLog.count({ where: { action: { startsWith: 'chatbot.tool.' }, actorId: user.id } });
  console.log('chatbot tool calls audited:', toolLog);

  const { register } = await import('../src/observability/metrics.ts');
  const metrics = await register.metrics();
  console.log('\nCONVERSATION METRICS:');
  console.log(metrics.split('\n').filter((l) => /chatbot_conversation_messages_(count|sum)|chatbot_turn_tool_calls_(count|sum)/.test(l)).join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
