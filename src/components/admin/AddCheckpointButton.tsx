'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export default function AddCheckpointButton({ eventId, nextIndex }: { eventId: string; nextIndex: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    clue: '',
    unlock_message: '',
    requires_media: false,
    has_survey: false,
    latitude: '',
    longitude: '',
    geo_radius_meters: '200',
  })
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await supabase.from('checkpoints').insert({
      event_id: eventId,
      order_index: nextIndex,
      title: form.title,
      clue: form.clue,
      unlock_message: form.unlock_message || null,
      requires_media: form.requires_media,
      has_survey: form.has_survey,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      geo_radius_meters: parseInt(form.geo_radius_meters),
      qr_token: uuidv4(),
    })

    setLoading(false)
    setOpen(false)
    setForm({ title: '', clue: '', unlock_message: '', requires_media: false, has_survey: false, latitude: '', longitude: '', geo_radius_meters: '200' })
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        <Plus size={14} />
        Aggiungi tappa
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="font-medium text-sm text-amber-900">Nuova tappa #{nextIndex + 1}</h3>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titolo *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Es. Cantina storica"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Indizio *</label>
        <textarea
          required
          value={form.clue}
          onChange={e => setForm(f => ({ ...f, clue: e.target.value }))}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          placeholder="Dove trovare la tappa successiva..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Messaggio di sblocco</label>
        <textarea
          value={form.unlock_message}
          onChange={e => setForm(f => ({ ...f, unlock_message: e.target.value }))}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          placeholder="Mostrato ai gruppi quando sbloccano questa tappa"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Latitudine GPS</label>
          <input
            type="number"
            step="any"
            value={form.latitude}
            onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="44.6936"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Longitudine GPS</label>
          <input
            type="number"
            step="any"
            value={form.longitude}
            onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="8.0359"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requires_media"
          checked={form.requires_media}
          onChange={e => setForm(f => ({ ...f, requires_media: e.target.checked }))}
          className="accent-amber-600"
        />
        <label htmlFor="requires_media" className="text-sm text-gray-700">
          Richiede upload foto/video per sbloccare
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="has_survey"
          checked={form.has_survey}
          onChange={e => setForm(f => ({ ...f, has_survey: e.target.checked }))}
          className="accent-violet-600"
        />
        <label htmlFor="has_survey" className="text-sm text-gray-700">
          <span className="font-medium text-violet-700">Valutazione caccia al tesoro</span>
          <span className="text-gray-400 text-xs ml-1">(mostra sondaggio di fine giornata)</span>
        </label>
      </div>

      <div className="flex gap-2 pt-1">
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
          className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Salva tappa
        </button>
      </div>
    </form>
  )
}
