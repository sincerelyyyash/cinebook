import { BookingsList } from '@/components/booking/bookings-list'

export const metadata = { title: 'My Bookings' }

export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 flex flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-ink">My Bookings</h1>
      <BookingsList />
    </div>
  )
}
