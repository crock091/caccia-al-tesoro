import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Calendar, Users, CheckSquare, Play, Archive } from 'lucide-react'
import type { Event } from '@/lib/types'
import DeleteEventButton from '@/components/admin/DeleteEventButton'
import ToggleEventStatusButton from '@/components/admin/ToggleEventStatusButton'

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'In corso', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completato', color: 'bg-blue-100 text-blue-700' },
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">I tuoi eventi</h1>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus size={16} />
          Nuovo evento
        </Link>
      </div>

      {!events?.length ? (
        <div className="text-center py-20 text-gray-400">
          <Trophy className="mx-auto mb-3 opacity-30" size={48} />
          <p className="text-lg font-medium">Nessun evento ancora</p>
          <p className="text-sm mt-1">Crea il tuo primo percorso di caccia al tesoro</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => {
            const s = statusLabels[event.status]
            return (
              <div key={event.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-900 text-base leading-tight">{event.name}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${s.color}`}>
                    {s.label}
                  </span>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                )}

                {event.date && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar size={13} />
                    {new Date(event.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="flex-1 text-center text-xs font-medium text-amber-700 hover:text-amber-900 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    Gestisci
                  </Link>
                  <ToggleEventStatusButton event={event} />
                  <DeleteEventButton eventId={event.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Trophy(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 24} height={props.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  )
}
