import Image from 'next/image'
import Link from 'next/link'
import { Users, Map, ArrowUpRight } from 'lucide-react'
import PoweredByFooter from '@/components/PoweredByFooter'
import PwaRedirect from '@/components/PwaRedirect'

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-x-hidden fade-in" style={{ background: 'rgb(23,55,45)' }}>
      <PwaRedirect />

      {/* Sfondo vigneti */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="fixed inset-0 w-full h-full object-cover"
        style={{ zIndex: -3 }}
        src="/sfondo.jpeg"
        alt="Vigneti nelle Langhe"
      />
      {/* Overlay forest verde scuro */}
      <div className="fixed inset-0" style={{ zIndex: -2, background: 'rgba(18,55,43,0.70)' }} />
      {/* Sfumatura radiale + gradiente */}
      <div className="fixed inset-0" style={{ zIndex: -1, background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 26%), linear-gradient(to bottom, rgba(12,42,31,.1), rgba(12,42,31,.38))' }} />

      <div className="w-full max-w-7xl mx-auto px-5 md:px-8 py-6 md:py-8 min-h-screen flex flex-col">
        <header className="flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo-sito-poll.avif" alt="Logo" style={{ height: '48px', width: 'auto' }} />
        </header>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="max-w-5xl mx-auto px-4 w-full">
            <p className="uppercase tracking-[0.22em] font-bold mb-4" style={{ color: 'rgb(231,200,156)', fontSize: '13px' }}>
              Piccoli indizi. Grandi avventure.
            </p>
            <h1 className="display font-bold max-w-4xl leading-[1.02] mb-10 drop-shadow-sm text-white" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.75rem)' }}>
              Trasforma ogni luogo in una storia da scoprire.
            </h1>

            <div className="flex flex-col gap-6 max-w-2xl">
              {/* Card gruppo */}
              <Link
                href="/join"
                className="text-left rounded-[1.7rem] p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 block"
                style={{ background: 'rgba(234,243,235,0.95)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 14px 34px rgba(7,33,24,.15)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-white" style={{ background: '#6f9d7d' }}>
                  <Users size={20} />
                </div>
                <h2 className="display font-bold mb-2" style={{ color: 'rgb(23,55,45)', fontSize: '1.5rem' }}>
                  Accesso gruppo
                </h2>
                <p className="text-sm leading-6" style={{ color: 'rgb(101,118,107)' }}>
                  Inserisci il codice ricevuto e inizia subito la tua avventura.
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold" style={{ color: '#a16f33' }}>
                  <span>Entra</span>
                  <ArrowUpRight size={16} />
                </div>
              </Link>

              {/* Badge organizzatore */}
              <Link
                href="/admin/login"
                className="text-left rounded-2xl px-4 py-2.5 w-fit flex items-center gap-2 transition-colors hover:bg-white/15"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(4px)' }}
              >
                <Map size={16} className="text-white" />
                <span className="text-sm font-semibold text-white">Organizzatore</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PoweredByFooter />
    </main>
  )
}


