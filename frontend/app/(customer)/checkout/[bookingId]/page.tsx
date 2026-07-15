import { Checkout } from '@/components/booking/checkout'

export const metadata = { title: 'Checkout' }

type Params = Promise<{ bookingId: string }>

export default async function CheckoutPage({ params }: { params: Params }) {
  const { bookingId } = await params
  return <Checkout bookingId={bookingId} />
}
