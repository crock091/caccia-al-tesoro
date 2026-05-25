'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'

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
    <main
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-6"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 30%, #9a3412 65%, #c2410c 100%)' }}
    >
      {/* Orbs decorativi */}
      <div
        className="absolute top-10 right-10 w-64 h-64 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}
      />
      <div
        className="absolute bottom-10 left-10 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 12px 40px rgba(234,88,12,0.40)' }}
          >
            🏆
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Partecipa all&apos;evento</h1>
          <p className="text-white/50 text-sm">Inserisci il codice invito ricevuto dall&apos;organizzatore</p>
        </div>

        {/* Form glass card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl p-6 flex flex-col gap-4"
          style={{ background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.16)' }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white/60 tracking-widest uppercase">
              Codice invito
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="K7X2MNPQ"
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="rounded-xl px-4 py-3.5 text-center text-2xl font-mono font-black tracking-widest text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
            />
          </div>

          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40"
            style={code.trim() && !loading
              ? { background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 8px 24px rgba(234,88,12,0.35)' }
              : { background: 'rgba(255,255,255,0.18)' }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Entra nel gruppo <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-5">
          Il codice ti è stato condiviso dall&apos;organizzatore via link o messaggio.
        </p>
      </div>
    </main>
  )
}
