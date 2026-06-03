import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import AdminLogoutButton from '@/components/admin/AdminLogoutButton'
import PushSubscribeButton from '@/components/admin/PushSubscribeButton'
import ServiceWorkerRegistrar from '@/components/admin/ServiceWorkerRegistrar'
import AdminChatWidget from '@/components/admin/AdminChatWidget'
import PoweredByFooter from '@/components/PoweredByFooter'
import { MapPin, Users, Star } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Se non loggato, mostra solo children (es. pagina login) senza nav.
  // proxy.ts gestisce già il redirect per le route protette.
  if (!user) return <>{children}</>

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#f0f4f0',
        backgroundImage: "url('/immagine-desktop.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(240,244,240,0.20)', zIndex: 0 }} />
      <ServiceWorkerRegistrar />
      <header className="relative z-30 sticky top-0 px-4 py-0" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-7">
            <Link href="/admin" className="flex items-center gap-3">
              <Image src="/Logo-sito-poll.avif" alt="Logo" width={110} height={110} className="rounded-xl shadow" />
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <Link href="/admin" className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <Users size={15} />
                Eventi
              </Link>
              <Link href="/admin/map" className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <MapPin size={15} />
                Mappa live
              </Link>
              <Link href="/admin/survey" className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <Star size={15} />
                Sondaggio
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <PushSubscribeButton />
            <AdminLogoutButton />
          </div>
        </div>
        {/* Navigazione mobile */}
        <nav className="sm:hidden flex items-center gap-1 border-t border-gray-100">
          <Link href="/admin" className="flex-1 flex flex-col items-center gap-0.5 text-gray-500 hover:text-green-700 py-2 text-xs font-medium transition-colors">
            <Users size={18} />
            <span>Eventi</span>
          </Link>
          <Link href="/admin/map" className="flex-1 flex flex-col items-center gap-0.5 text-gray-500 hover:text-green-700 py-2 text-xs font-medium transition-colors">
            <MapPin size={18} />
            <span>Mappa live</span>
          </Link>
          <Link href="/admin/survey" className="flex-1 flex flex-col items-center gap-0.5 text-gray-500 hover:text-green-700 py-2 text-xs font-medium transition-colors">
            <Star size={18} />
            <span>Sondaggio</span>
          </Link>
        </nav>
      </header>
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <PoweredByFooter />
      <AdminChatWidget />
    </div>
  )
}
