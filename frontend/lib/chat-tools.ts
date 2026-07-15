import { Armchair, Buildings, CalendarDots, CalendarPlus, CheckCircle, ClockCounterClockwise, CreditCard, FilmStrip, Lifebuoy, Lock, LockOpen, MagnifyingGlass, MonitorPlay, Robot, SealCheck, SealPercent, Sparkle, Star, Tag, Ticket, Translate, TrendUp, UserGear, Users, Wrench, XCircle } from '@phosphor-icons/react/ssr'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

interface ToolMeta {
  active: string
  done: string
  icon: PhosphorIcon
}

/**
 * Present/past labels + icon for each chatbot tool, so the tool-activity chips
 * read like a helpful assistant narrating its work. `delegate_booking` is the
 * handoff to the booking sub-agent and gets a distinct look.
 */
export const TOOL_META: Record<string, ToolMeta> = {
  search_movies: { active: 'Searching movies', done: 'Searched movies', icon: MagnifyingGlass },
  get_movie_details: { active: 'Getting movie details', done: 'Got movie details', icon: FilmStrip },
  get_cast: { active: 'Looking up the cast', done: 'Got the cast', icon: Users },
  get_reviews: { active: 'Reading reviews', done: 'Read reviews', icon: Star },
  get_showtimes: { active: 'Finding showtimes', done: 'Found showtimes', icon: CalendarDots },
  suggest_similar: { active: 'Finding similar movies', done: 'Found similar movies', icon: Sparkle },
  get_trending: { active: 'Checking what’s trending', done: 'Got trending movies', icon: TrendUp },
  get_upcoming: { active: 'Checking upcoming releases', done: 'Got upcoming releases', icon: CalendarPlus },
  list_languages: { active: 'Listing languages', done: 'Listed languages', icon: Translate },
  list_genres: { active: 'Listing genres', done: 'Listed genres', icon: Tag },
  find_theatres: { active: 'Finding theatres', done: 'Found theatres', icon: Buildings },
  get_screen_info: { active: 'Getting screen info', done: 'Got screen info', icon: MonitorPlay },
  check_seat_availability: { active: 'Checking seat availability', done: 'Checked seats', icon: Armchair },
  hold_seats: { active: 'Holding your seats', done: 'Held your seats', icon: Lock },
  release_seats: { active: 'Releasing the hold', done: 'Released the hold', icon: LockOpen },
  create_booking: { active: 'Creating your booking', done: 'Created booking', icon: Ticket },
  check_booking_status: { active: 'Checking booking status', done: 'Checked booking status', icon: SealCheck },
  cancel_booking: { active: 'Cancelling booking', done: 'Cancelled booking', icon: XCircle },
  view_booking_history: { active: 'Fetching your bookings', done: 'Got your bookings', icon: ClockCounterClockwise },
  start_payment: { active: 'Starting payment', done: 'Started payment', icon: CreditCard },
  confirm_payment: { active: 'Confirming payment', done: 'Payment confirmed', icon: CheckCircle },
  preview_promo: { active: 'Checking the offer', done: 'Checked the offer', icon: SealPercent },
  apply_promo: { active: 'Applying promo', done: 'Applied promo', icon: SealPercent },
  get_offers: { active: 'Looking for offers', done: 'Found offers', icon: SealPercent },
  get_profile: { active: 'Reading your profile', done: 'Read your profile', icon: UserGear },
  update_preferences: { active: 'Saving your preferences', done: 'Saved preferences', icon: UserGear },
  get_recommendations: { active: 'Personalizing picks', done: 'Got recommendations', icon: Sparkle },
  contact_support: { active: 'Contacting support', done: 'Contacted support', icon: Lifebuoy },
  delegate_booking: { active: 'Booking assistant is working', done: 'Booking assistant finished', icon: Robot },
}

export function toolMeta(tool: string): ToolMeta {
  return (
    TOOL_META[tool] ?? {
      active: humanize(tool),
      done: humanize(tool),
      icon: Wrench,
    }
  )
}

export function isSubAgent(tool: string): boolean {
  return tool === 'delegate_booking'
}

function humanize(tool: string): string {
  const s = tool.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
