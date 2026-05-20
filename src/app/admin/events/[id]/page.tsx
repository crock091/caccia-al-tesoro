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
        <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          event.status === 'active' ? 'bg-green-100 text-green-700' :
          event.status === 'completed' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {event.status === 'active' ? 'In corso' : event.status === 'completed' ? 'Completato' : 'Bozza'}
        </span>
      </div>
      {event.date && (
        <p className="text-sm text-gray-400 mb-6 ml-9">
          {new Date(event.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tappe */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Tappe ({checkpoints?.length ?? 0})</h2>
            <AddCheckpointButton eventId={id} nextIndex={(checkpoints?.length ?? 0)} />
          </div>
          <CheckpointList checkpoints={(checkpoints as Checkpoint[]) ?? []} eventId={id} />
        </section>

        {/* Gruppi */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Gruppi ({groups?.length ?? 0})</h2>
            <AddGroupButton eventId={id} />
          </div>
          <GroupList groups={(groups as Group[]) ?? []} totalCheckpoints={checkpoints?.length ?? 0} />
        </section>
      </div>

      {/* Approvazioni media pendenti */}
      <section className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">📸 Media da approvare</h2>
        <SubmissionsPanel eventId={id} />
      </section>
    </div>
  )
}
