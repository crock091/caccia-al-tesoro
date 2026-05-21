import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminLogoutButton from '@/components/admin/AdminLogoutButton'
import { Trophy, MapPin, Users, Star } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Se non loggato, mostra solo children (es. pagina login) senza nav.
  // proxy.ts gestisce già il redirect per le route protette.
  if (!user) return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-gray-900">
              <Trophy size={20} className="text-amber-600" />
              <span className="hidden xs:inline">Caccia al Tesoro</span>
              <span className="xs:hidden">CaT</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <Users size={15} />
                Eventi
              </Link>
              <Link href="/admin/map" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <MapPin size={15} />
                Mappa live
              </Link>
              <Link href="/admin/survey" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <Star size={15} />
                Sondaggio
              </Link>
            </nav>
          </div>
          <AdminLogoutButton />
        </div>
        {/* Navigazione mobile */}
        <nav className="sm:hidden flex items-center gap-1 mt-2 border-t border-gray-100 pt-2">
          <Link href="/admin" className="flex-1 flex flex-col items-center gap-0.5 text-gray-600 hover:text-gray-900 py-1 text-xs">
            <Users size={18} />
            <span>Eventi</span>
          </Link>
          <Link href="/admin/map" className="flex-1 flex flex-col items-center gap-0.5 text-gray-600 hover:text-gray-900 py-1 text-xs">
            <MapPin size={18} />
            <span>Mappa live</span>
          </Link>
          <Link href="/admin/survey" className="flex-1 flex flex-col items-center gap-0.5 text-gray-600 hover:text-gray-900 py-1 text-xs">
            <Star size={18} />
            <span>Sondaggio</span>
          </Link>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
