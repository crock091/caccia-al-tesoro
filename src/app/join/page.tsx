'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ArrowRight, Loader2 } from 'lucide-react'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    router.push(`/join/${trimmed}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-amber-900 mb-1">Partecipa all&apos;evento</h1>
          <p className="text-amber-700 text-sm">Inserisci il codice invito ricevuto dall&apos;organizzatore</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users size={15} />
              Codice invito
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Es. K7X2MNPQ"
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Entra nel gruppo
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-amber-600 mt-4">
          Il codice ti è stato condiviso dall&apos;organizzatore via link o messaggio.
        </p>
      </div>
    </main>
  )
}
