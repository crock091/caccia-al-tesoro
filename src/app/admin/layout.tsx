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
        backgroundColor: 'rgb(23,55,45)',
        backgroundImage: "url('/sfondo.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay forest */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(18,55,43,0.70)', zIndex: 0 }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 26%), linear-gradient(to bottom, rgba(12,42,31,.1), rgba(12,42,31,.38))', zIndex: 1 }} />
      <ServiceWorkerRegistrar />
      {/* Navbar */}
      <header
        className="relative z-30 sticky top-0"
        style={{ background: 'rgba(255,250,240,0.96)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(23,55,45,0.12)' }}
      >
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between px-5 md:px-8 gap-4">
          <div className="flex items-center gap-5">
            <Link href="/admin">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo-sito-poll.avif" alt="Logo" style={{ height: '36px', width: 'auto' }} />
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/admin" className="text-sm font-semibold px-3 py-2 rounded-xl flex items-center gap-2 transition-colors hover:bg-[#eef5ef]" style={{ color: '#17372d' }}>
                <Users size={15} /> I tuoi eventi
              </Link>
              <Link href="/admin/map" className="text-sm font-semibold px-3 py-2 rounded-xl flex items-center gap-2 transition-colors hover:bg-[#eef5ef]" style={{ color: '#17372d' }}>
                <MapPin size={15} /> Mappa live
              </Link>
              <Link href="/admin/survey" className="text-sm font-semibold px-3 py-2 rounded-xl flex items-center gap-2 transition-colors hover:bg-[#eef5ef]" style={{ color: '#17372d' }}>
                <Star size={15} /> Sondaggio
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <PushSubscribeButton />
            <AdminLogoutButton />
          </div>
        </div>
        {/* Navigazione mobile */}
        <nav className="sm:hidden flex items-center border-t" style={{ borderColor: 'rgba(23,55,45,0.10)' }}>
          <Link href="/admin" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors" style={{ color: '#17372d' }}>
            <Users size={18} />
            <span>Eventi</span>
          </Link>
          <Link href="/admin/map" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors" style={{ color: '#17372d' }}>
            <MapPin size={18} />
            <span>Mappa live</span>
          </Link>
          <Link href="/admin/survey" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors" style={{ color: '#17372d' }}>
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
