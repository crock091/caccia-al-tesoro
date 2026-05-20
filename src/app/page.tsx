import Link from 'next/link'
import { MapPin, Users, Trophy } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl font-bold text-amber-900 mb-2">Caccia al Tesoro</h1>
        <p className="text-amber-700 text-lg">Langhe &amp; Roero</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/join"
          className="flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg transition-colors text-lg"
        >
          <Users size={22} />
          Partecipa a un evento
        </Link>

        <Link
          href="/admin/login"
          className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-2xl shadow border border-gray-200 transition-colors text-lg"
        >
          <Trophy size={22} />
          Area organizzatore
        </Link>
      </div>

      <div className="mt-16 flex gap-8 text-amber-700">
        <div className="text-center">
          <MapPin size={28} className="mx-auto mb-1" />
          <p className="text-sm">GPS live</p>
        </div>
        <div className="text-center">
          <span className="text-2xl block mb-1">📸</span>
          <p className="text-sm">Prove foto/video</p>
        </div>
        <div className="text-center">
          <span className="text-2xl block mb-1">🗺️</span>
          <p className="text-sm">Mappa interattiva</p>
        </div>
      </div>
    </main>
  )
}
