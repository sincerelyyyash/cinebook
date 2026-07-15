import { notFound } from 'next/navigation'
import { getShow } from '@/lib/api/catalog'
import { ApiError } from '@/lib/api/client'
import { SeatSelection } from '@/components/booking/seat-selection'

export const metadata = { title: 'Select seats' }

type Params = Promise<{ showId: string }>

export default async function SeatsPage({ params }: { params: Params }) {
  const { showId } = await params

  let show
  try {
    show = await getShow(showId)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return <SeatSelection show={show} />
}
