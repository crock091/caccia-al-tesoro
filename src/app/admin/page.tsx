import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Calendar } from 'lucide-react'
import type { Event } from '@/lib/types'
import DeleteEventButton from '@/components/admin/DeleteEventButton'
import ToggleEventStatusButton from '@/components/admin/ToggleEventStatusButton'

const statusLabels: Record<string, { label: string; style: React.CSSProperties }> = {
  draft:     { label: 'Bozza',      style: { background: 'rgba(219,232,220,0.9)', color: '#4a6258' } },
  active:    { label: 'In corso',   style: { background: 'rgba(74,222,128,0.15)', color: '#166534' } },
  completed: { label: 'Completato', style: { background: 'rgba(184,132,69,0.15)', color: '#7a4f1e' } },
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
        <h1 className="display text-2xl font-bold text-white drop-shadow">I tuoi eventi</h1>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-2 font-semibold px-4 py-2.5 rounded-2xl transition-opacity text-sm"
          style={{ background: 'rgba(255,250,240,0.97)', color: '#17372d', border: '1px solid rgba(23,55,45,0.15)', boxShadow: '0 2px 12px rgba(8,30,22,0.12)' }}
        >
          <Plus size={16} />
          Nuovo evento
        </Link>
      </div>

      {!events?.length ? (
        <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <Trophy className="mx-auto mb-3 opacity-30" size={48} />
          <p className="text-lg font-medium">Nessun evento ancora</p>
          <p className="text-sm mt-1">Crea il tuo primo percorso di caccia al tesoro</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => {
            const s = statusLabels[event.status]
            const topColor = event.status === 'active'
              ? 'linear-gradient(90deg, #4ade80, #166534)'
              : event.status === 'completed'
              ? 'linear-gradient(90deg, #b88445, #e7d2b5)'
              : 'linear-gradient(90deg, #dbe8dc, #ecf3ed)'
            return (
              <div key={event.id} className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden transition-all hover:-translate-y-0.5" style={{ background: 'rgba(255,250,240,0.97)', boxShadow: '0 14px 34px rgba(7,33,24,0.15)', border: '1px solid rgba(255,255,255,0.6)' }}>
                {/* Top status stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: topColor }} />
                <div className="flex items-start justify-between gap-2 mt-1">
                  <h2 className="font-bold text-[#17372d] text-base leading-tight">{event.name}</h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap" style={s.style}>
                    {s.label}
                  </span>
                </div>

                {event.description && (
                  <p className="text-sm line-clamp-2" style={{ color: '#667a6e' }}>{event.description}</p>
                )}

                {event.date && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9aac9f' }}>
                    <Calendar size={13} />
                    {new Date(event.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-2" style={{ borderTop: '1px solid #e8f0e9' }}>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="flex-1 text-center text-xs font-semibold py-1.5 rounded-xl transition-colors hover:bg-[#eef5ef]"
                    style={{ color: '#17372d' }}
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
