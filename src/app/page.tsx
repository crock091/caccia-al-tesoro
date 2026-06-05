import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Camera, Map, ChevronRight } from 'lucide-react'
import PoweredByFooter from '@/components/PoweredByFooter'
import PwaRedirect from '@/components/PwaRedirect'

export default function HomePage() {
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
      <PwaRedirect />
      {/* Gradiente che sbiadisce la parte bassa */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(5,10,15,0.45) 0%, rgba(5,10,15,0.75) 45%, rgba(5,10,15,0.97) 72%, rgba(5,10,15,1) 85%)' }}
      />

      {/* Contenuto in basso */}
      <div className="relative z-10 mt-auto px-6 pb-4 pt-4 w-full max-w-sm mx-auto flex flex-col items-center text-center">
        <div className="bg-white rounded-2xl p-3 mb-4 shadow-lg">
          <Image src="/Logo-sito-poll.avif" alt="Logo" width={120} height={120} />
        </div>
        <h1
          className="text-4xl font-black tracking-tight mb-1 leading-none"
          style={{ color: '#6DAB3C', textShadow: '0 0 24px rgba(109,171,60,0.35)' }}
        >
          Caccia al Tesoro
        </h1>
        <p className="text-xs font-semibold tracking-widest uppercase mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Langhe &amp; Roero</p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/join"
            className="group flex items-center justify-between font-bold py-4 px-6 rounded-full text-base transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#0a0b0d', boxShadow: '0 8px 28px rgba(109,171,60,0.35)' }}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🗺️</span>
              Partecipa a un evento
            </span>
            <ChevronRight size={20} />
          </Link>

          <Link
            href="/admin/login"
            className="group flex items-center justify-between font-semibold py-4 px-6 rounded-full text-base transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              Area organizzatore
            </span>
            <ChevronRight size={20} className="opacity-50" />
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-8 flex gap-3">
          {[
            { icon: <MapPin size={16} style={{ color: '#6DAB3C' }} />, label: 'GPS live' },
            { icon: <Camera size={16} style={{ color: '#6DAB3C' }} />, label: 'Prove foto' },
            { icon: <Map size={16} style={{ color: '#6DAB3C' }} />, label: 'Mappa' },
          ].map(f => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {f.icon}
              <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</p>
            </div>
          ))}
        </div>
        <PoweredByFooter dark />
      </div>
    </main>
  )
}
