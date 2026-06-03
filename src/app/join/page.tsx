'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import PoweredByFooter from '@/components/PoweredByFooter'

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
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: '#0a0b0d',
        backgroundImage: `url('/game-bg.png')`,
        backgroundSize: 'auto 100vh',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Gradiente che sbiadisce la parte bassa per il form */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(5,10,15,0.45) 0%, rgba(5,10,15,0.75) 45%, rgba(5,10,15,0.97) 72%, rgba(5,10,15,1) 85%)' }}
      />

      {/* Contenuto — spinto in fondo */}
      <div className="relative z-10 mt-auto px-6 pb-4 pt-4 w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl p-3 mb-3 shadow-lg inline-block">
            <Image src="/Logo-sito-poll.avif" alt="Logo" width={100} height={100} />
          </div>
          <h1
            className="text-3xl font-black mb-1 tracking-tight"
            style={{ color: '#6DAB3C', textShadow: '0 0 20px rgba(109,171,60,0.35)' }}
          >
            Caccia al Tesoro
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Inserisci il codice ricevuto dall&apos;organizzatore
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(109,171,60,0.7)' }}>
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
              className="rounded-2xl px-4 py-4 text-center text-2xl font-mono font-black tracking-widest text-white placeholder:text-white/20 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(109,171,60,0.25)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="flex items-center justify-center gap-2 font-bold py-4 rounded-full transition-all active:scale-95 disabled:opacity-40 text-sm"
            style={code.trim() && !loading
              ? { background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#0a0b0d', boxShadow: '0 8px 28px rgba(109,171,60,0.35)' }
              : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Entra nel gruppo <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Il codice ti è stato condiviso dall&apos;organizzatore via link o messaggio.
        </p>
        <PoweredByFooter dark />
      </div>
    </main>
  )
}
