'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, MapPin, Camera } from 'lucide-react'
import type { Checkpoint } from '@/lib/types'

export default function CheckpointList({ checkpoints, eventId }: { checkpoints: Checkpoint[]; eventId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa tappa?')) return
    setDeletingId(id)
    await supabase.from('checkpoints').delete().eq('id', id)
    router.refresh()
    setDeletingId(null)
  }

  if (!checkpoints.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Nessuna tappa ancora. Aggiungine una!</p>
  }

  return (
    <ol className="flex flex-col gap-3">
      {checkpoints.map((cp, i) => (
        <li key={cp.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:border-amber-200 transition-colors">
          <div className="flex-shrink-0 w-7 h-7 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900">{cp.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cp.clue}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {cp.latitude && cp.longitude && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <MapPin size={11} />
                  GPS
                </span>
              )}
              {cp.requires_media && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <Camera size={11} />
                  Media richiesto
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleDelete(cp.id)}
            disabled={deletingId === cp.id}
            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {deletingId === cp.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </li>
      ))}
    </ol>
  )
}
