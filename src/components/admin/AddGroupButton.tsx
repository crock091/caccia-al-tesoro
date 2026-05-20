'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Copy, Check } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export default function AddGroupButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [groupName, setGroupName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const invite_code = uuidv4().slice(0, 8).toUpperCase()

    await supabase.from('groups').insert({
      event_id: eventId,
      name: groupName,
      invite_code,
    })

    setLoading(false)
    setOpen(false)
    setGroupName('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        <Plus size={14} />
        Aggiungi gruppo
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="font-medium text-sm text-blue-900">Nuovo gruppo</h3>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nome gruppo *</label>
        <input
          type="text"
          required
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Es. Team Rossi"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Crea gruppo
        </button>
      </div>
    </form>
  )
}
