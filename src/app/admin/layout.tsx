import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminLogoutButton from '@/components/admin/AdminLogoutButton'
import PushSubscribeButton from '@/components/admin/PushSubscribeButton'
import ServiceWorkerRegistrar from '@/components/admin/ServiceWorkerRegistrar'
import AdminChatWidget from '@/components/admin/AdminChatWidget'
import { Trophy, MapPin, Users, Star } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Se non loggato, mostra solo children (es. pagina login) senza nav.
  // proxy.ts gestisce già il redirect per le route protette.
  if (!user) return <>{children}</>

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ServiceWorkerRegistrar />
      <header className="bg-white border-b border-gray-100 px-4 py-0 sticky top-0 z-30" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-7">
            <Link href="/admin" className="flex items-center gap-2.5 font-black text-gray-900">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 12px rgba(234,88,12,0.3)' }}
              >
                🏆
              </div>
              <span className="hidden xs:inline tracking-tight">CaT</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <Link href="/admin" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                <Users size={15} />
                Eventi
              </Link>
              <Link href="/admin/map" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                <MapPin size={15} />
                Mappa live
              </Link>
              <Link href="/admin/survey" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
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
        <nav className="sm:hidden flex items-center gap-1 mt-0 border-t border-gray-100 pt-0">
          <Link href="/admin" className="flex-1 flex flex-col items-center gap-0.5 text-gray-500 hover:text-amber-600 py-2 text-xs font-medium transition-colors">
            <Users size={18} />
            <span>Eventi</span>
          </Link>
          <Link href="/admin/map" className="flex-1 flex flex-col items-center gap-0.5 text-gray-500 hover:text-amber-600 py-2 text-xs font-medium transition-colors">
            <MapPin size={18} />
            <span>Mappa live</span>
          </Link>
          <Link href="/admin/survey" className="flex-1 flex flex-col items-center gap-0.5 text-gray-500 hover:text-amber-600 py-2 text-xs font-medium transition-colors">
            <Star size={18} />
            <span>Sondaggio</span>
          </Link>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <AdminChatWidget />
    </div>
  )
}
