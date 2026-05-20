'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import Image from 'next/image'
import type { Submission } from '@/lib/types'

interface SubmissionWithGroup extends Submission {
  groups: { name: string }
  checkpoints: { title: string }
}

export default function SubmissionsPanel({ eventId }: { eventId: string }) {
  const [submissions, setSubmissions] = useState<SubmissionWithGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchSubmissions() {
    const { data } = await supabase
      .from('submissions')
      .select('*, groups(name), checkpoints(title)')
      .eq('status', 'pending')
      .in('group_id',
        (await supabase.from('groups').select('id').eq('event_id', eventId)).data?.map(g => g.id) ?? []
      )
      .order('submitted_at', { ascending: true })

    setSubmissions((data as SubmissionWithGroup[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSubmissions()

    // Realtime: aggiorna quando arrivano nuovi invii
    const channel = supabase
      .channel('submissions-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        fetchSubmissions()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleReview(submissionId: string, groupId: string, checkpointId: string, approve: boolean) {
    setActionLoading(submissionId)
    const supabase = createClient()

    await supabase
      .from('submissions')
      .update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', submissionId)

    if (approve) {
      // Avanza il gruppo alla tappa successiva
      const { data: group } = await supabase
        .from('groups')
        .select('current_checkpoint_index')
        .eq('id', groupId)
        .single()

      const { data: totalCheckpoints } = await supabase
        .from('checkpoints')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)

      const nextIndex = (group?.current_checkpoint_index ?? 0) + 1
      const total = totalCheckpoints?.length ?? 0

      await supabase
        .from('groups')
        .update({
          current_checkpoint_index: nextIndex,
          finished: nextIndex >= total,
          finished_at: nextIndex >= total ? new Date().toISOString() : null,
        })
        .eq('id', groupId)

      // Log progresso
      await supabase.from('group_progress').insert({ group_id: groupId, checkpoint_id: checkpointId })
    }

    setActionLoading(null)
    fetchSubmissions()
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
  }

  if (!submissions.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Clock size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nessun media in attesa di approvazione</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {submissions.map(sub => (
        <div key={sub.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex gap-4">
          <div className="flex-shrink-0">
            {sub.media_type === 'image' ? (
              <a href={sub.media_url} target="_blank" rel="noopener noreferrer">
                <Image
                  src={sub.media_url}
                  alt="Submission"
                  width={80}
                  height={80}
                  className="rounded-lg object-cover w-20 h-20 hover:opacity-80 transition-opacity"
                />
              </a>
            ) : (
              <a href={sub.media_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center w-20 h-20 bg-gray-800 rounded-lg text-white text-xs font-medium hover:opacity-80 transition-opacity">
                ▶ Video
              </a>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900">{sub.groups?.name}</p>
            <p className="text-xs text-gray-500">Tappa: {sub.checkpoints?.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(sub.submitted_at).toLocaleString('it-IT')}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleReview(sub.id, sub.group_id, sub.checkpoint_id, true)}
                disabled={actionLoading === sub.id}
                className="flex items-center gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === sub.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                Approva
              </button>
              <button
                onClick={() => handleReview(sub.id, sub.group_id, sub.checkpoint_id, false)}
                disabled={actionLoading === sub.id}
                className="flex items-center gap-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle size={13} />
                Rifiuta
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
