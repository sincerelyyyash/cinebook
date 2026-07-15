import { Suspense } from 'react'
import { BookingDetail } from '@/components/booking/booking-detail'

export const metadata = { title: 'Booking' }

type Params = Promise<{ id: string }>

export default async function BookingDetailPage({ params }: { params: Params }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <BookingDetail bookingId={id} />
    </Suspense>
  )
}
