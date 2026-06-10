'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
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
      className="min-h-screen flex flex-col relative overflow-hidden fade-in"
      style={{ background: 'rgb(23,55,45)' }}
    >
      {/* Sfondo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: -3 }} src="/sfondo.jpeg" alt="" />
      <div className="fixed inset-0" style={{ zIndex: -2, background: 'rgba(18,55,43,0.70)' }} />
      <div className="fixed inset-0" style={{ zIndex: -1, background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 26%), linear-gradient(to bottom, rgba(12,42,31,.1), rgba(12,42,31,.38))' }} />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row md:items-center md:gap-16">
          {/* Lato sinistro — testo hero (visibile solo su desktop) */}
          <div className="hidden md:flex flex-col flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-sito-poll.avif" alt="Logo" style={{ width: '140px', height: 'auto', marginBottom: '2rem' }} />
            <p className="uppercase tracking-[0.22em] font-bold mb-3" style={{ color: 'rgb(231,200,156)', fontSize: '13px' }}>Piccoli indizi. Grandi avventure.</p>
            <h1 className="display font-bold leading-[1.02] mb-4 drop-shadow-sm text-white" style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)' }}>
              Trasforma ogni luogo in una storia da scoprire.
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Inserisci il codice ricevuto dall&apos;organizzatore e inizia subito la tua avventura.</p>
          </div>

          {/* Lato destro — form (sempre visibile) */}
          <div className="w-full md:w-[360px] flex-shrink-0">
            <div className="flex flex-col items-center mb-8 md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo-sito-poll.avif" alt="Logo" style={{ height: '48px', width: 'auto', marginBottom: '1.25rem' }} />
              <h1 className="display font-bold text-center mb-1" style={{ color: '#4ade80', fontSize: '2.2rem' }}>Caccia al Tesoro</h1>
              <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.75)' }}>Inserisci il codice ricevuto dall&apos;organizzatore</p>
            </div>

            <div className="rounded-[2rem] p-6 md:p-8" style={{ background: 'rgba(255,250,240,0.10)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2 hidden md:block" style={{ color: '#4ade80' }}>Codice invito</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 md:hidden" style={{ color: '#4ade80' }}>Codice invito</p>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="K7X2MNPQ"
                    maxLength={12}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-2xl px-6 py-4 text-center text-xl font-mono font-black tracking-[0.25em] text-white placeholder:text-white/20 focus:outline-none border-0"
                    style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', caretColor: '#4ade80' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl px-6 py-4 text-base font-bold flex items-center justify-center gap-2 mt-2 transition-opacity disabled:opacity-60 active:scale-95"
                  style={{ background: '#17372d', color: '#fff', border: '1px solid rgba(74,222,128,0.3)' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  Entra nel gruppo <ArrowRight size={20} />
                </button>
              </form>
              <p className="mt-4 text-xs text-center" style={{ color: 'rgba(255,255,255,0.40)' }}>Il codice ti è stato condiviso dall&apos;organizzatore via link o messaggio.</p>
            </div>
          </div>
        </div>
      </div>

      <PoweredByFooter />
    </main>
  )
}
