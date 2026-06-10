import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Users } from 'lucide-react'
import type { Checkpoint, Group } from '@/lib/types'
import CheckpointList from '@/components/admin/CheckpointList'
import GroupList from '@/components/admin/GroupList'
import AddGroupButton from '@/components/admin/AddGroupButton'
import AddCheckpointButton from '@/components/admin/AddCheckpointButton'
import SubmissionsPanel from '@/components/admin/SubmissionsPanel'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: event }, { data: checkpoints }, { data: groups }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('checkpoints').select('*').eq('event_id', id).order('order_index'),
    supabase.from('groups').select('*').eq('event_id', id).order('created_at'),
  ])

  if (!event) notFound()

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin" className="transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="display text-2xl font-bold text-white drop-shadow">{event.name}</h1>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{
          ...(event.status === 'active'
            ? { background: 'rgba(74,222,128,0.15)', color: '#166534' }
            : event.status === 'completed'
            ? { background: 'rgba(184,132,69,0.15)', color: '#7a4f1e' }
            : { background: 'rgba(219,232,220,0.9)', color: '#4a6258' })
        }}>
          {event.status === 'active' ? 'In corso' : event.status === 'completed' ? 'Completato' : 'Bozza'}
        </span>
      </div>
      {event.date && (
        <p className="text-sm mb-6 ml-9" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {new Date(event.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tappe */}
        <section className="rounded-2xl p-5" style={{ background: 'rgba(255,250,240,0.97)', boxShadow: '0 14px 34px rgba(7,33,24,0.15)', border: '1px solid rgba(255,255,255,0.6)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: '#17372d' }}>Tappe ({checkpoints?.length ?? 0})</h2>
            <AddCheckpointButton eventId={id} nextIndex={(checkpoints?.length ?? 0)} />
          </div>
          <CheckpointList checkpoints={(checkpoints as Checkpoint[]) ?? []} eventId={id} />
        </section>

        {/* Gruppi */}
        <section className="rounded-2xl p-5" style={{ background: 'rgba(255,250,240,0.97)', boxShadow: '0 14px 34px rgba(7,33,24,0.15)', border: '1px solid rgba(255,255,255,0.6)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: '#17372d' }}>Gruppi ({groups?.length ?? 0})</h2>
            <AddGroupButton eventId={id} />
          </div>
          <GroupList groups={(groups as Group[]) ?? []} totalCheckpoints={checkpoints?.length ?? 0} eventId={id} />
        </section>
      </div>

      {/* Approvazioni media pendenti */}
      <section className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(255,250,240,0.97)', boxShadow: '0 14px 34px rgba(7,33,24,0.15)', border: '1px solid rgba(255,255,255,0.6)' }}>
        <h2 className="font-semibold mb-4" style={{ color: '#17372d' }}>📸 Media da approvare</h2>
        <SubmissionsPanel eventId={id} />
      </section>
    </div>
  )
}
