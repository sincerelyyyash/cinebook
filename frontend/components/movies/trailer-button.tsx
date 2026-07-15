'use client'

import { useState } from 'react'
import { Play } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

/** Convert common YouTube URLs to an embeddable form; otherwise return as-is. */
function toEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    return url
  } catch {
    return url
  }
}

/** "Watch trailer" → modal with an embedded player. */
export function TrailerButton({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Play size={14} /> Watch trailer
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${title} trailer`} className="max-w-2xl">
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-canvas border border-line-2">
          <iframe
            src={toEmbed(url)}
            title={`${title} trailer`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Modal>
    </>
  )
}
