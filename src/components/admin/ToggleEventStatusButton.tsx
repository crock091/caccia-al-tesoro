'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Play, Pause, Archive, Loader2 } from 'lucide-react'
import type { Event, EventStatus } from '@/lib/types'

const nextStatus: Record<EventStatus, EventStatus> = {
  draft: 'active',
  active: 'completed',
  completed: 'draft',
}
const statusIcons: Record<EventStatus, React.ReactNode> = {
  draft: <Play size={15} />,
  active: <Archive size={15} />,
  completed: <Play size={15} />,
}
const statusTitles: Record<EventStatus, string> = {
  draft: 'Avvia evento',
  active: 'Chiudi evento',
  completed: 'Riapri come bozza',
}

export default function ToggleEventStatusButton({ event }: { event: Event }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleToggle() {
    setLoading(true)
    await supabase
      .from('events')
      .update({ status: nextStatus[event.status] })
      .eq('id', event.id)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50 disabled:opacity-50"
      title={statusTitles[event.status]}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : statusIcons[event.status]}
    </button>
  )
}
