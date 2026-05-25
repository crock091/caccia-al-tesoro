import Link from 'next/link'
import { MapPin, Camera, Map, ChevronRight } from 'lucide-react'

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 30%, #9a3412 65%, #c2410c 100%)' }}
    >
      {/* Orbs decorativi */}
      <div
        className="absolute top-16 left-4 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}
      />
      <div
        className="absolute bottom-16 right-4 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ef4444, transparent)' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm">
        {/* Logo badge */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 text-5xl"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 20px 60px rgba(234,88,12,0.45)' }}
        >
          🏆
        </div>

        <h1 className="text-5xl font-black text-white tracking-tight mb-2 leading-none">
          Caccia al<br />
          <span style={{ background: 'linear-gradient(90deg, #fbbf24, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tesoro
          </span>
        </h1>
        <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-12">Langhe &amp; Roero</p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/join"
            className="group flex items-center justify-between text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 8px 32px rgba(234,88,12,0.40)' }}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🗺️</span>
              Partecipa a un evento
            </span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/admin/login"
            className="group flex items-center justify-between font-semibold py-4 px-6 rounded-2xl text-lg transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.88)' }}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              Area organizzatore
            </span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform opacity-60" />
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-12 flex gap-3">
          {[
            { icon: <MapPin size={18} className="text-amber-300" />, label: 'GPS live' },
            { icon: <Camera size={18} className="text-amber-300" />, label: 'Prove foto' },
            { icon: <Map size={18} className="text-amber-300" />, label: 'Mappa' },
          ].map(f => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}
            >
              {f.icon}
              <p className="text-xs text-white/55 font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
