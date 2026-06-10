'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewEventPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('events')
      .insert({ name, description: description || null, date: date || null })
      .select()
      .single()

    if (error) {
      setError('Errore durante la creazione. Riprova.')
      setLoading(false)
      return
    }

    router.push(`/admin/events/${data.id}`)
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="display text-2xl font-bold text-white drop-shadow">Nuovo evento</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl p-6 flex flex-col gap-5" style={{ background: 'rgba(255,250,240,0.97)', boxShadow: '0 14px 34px rgba(7,33,24,0.15)', border: '1px solid rgba(255,255,255,0.6)' }}>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#405f51' }}>Nome evento *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2"
            style={{ border: '1px solid #d9e4da' }}
            placeholder="Es. Addio al celibato - Marco"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#405f51' }}>Descrizione</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 resize-none"
            style={{ border: '1px solid #d9e4da' }}
            placeholder="Note sull'evento..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#405f51' }}>Data</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2"
            style={{ border: '1px solid #d9e4da' }}
          />
        </div>

        {error && (
          <p className="text-sm rounded-xl px-4 py-2.5" style={{ color: '#a14f40', background: 'rgba(161,79,64,0.08)', border: '1px solid rgba(161,79,64,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin"
            className="flex-1 text-center py-2.5 rounded-2xl text-sm font-semibold transition-colors hover:bg-[#eef5ef]"
            style={{ border: '1px solid #d9e4da', color: '#17372d' }}
          >
            Annulla
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 disabled:opacity-60 font-semibold py-2.5 rounded-2xl transition-colors text-sm"
            style={{ background: '#17372d', color: '#fff' }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Crea evento
          </button>
        </div>
      </form>
    </div>
  )
}
