'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, Loader2, Download, Images, Trash2 } from 'lucide-react'
import Image from 'next/image'
import type { Submission } from '@/lib/types'

interface SubmissionWithGroup extends Submission {
  groups: { name: string }
  checkpoints: { title: string; has_survey: boolean; clue_image_url: string | null }
}

function downloadFile(url: string, filename: string) {
  fetch(url)
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    })
}

export default function SubmissionsPanel({ eventId }: { eventId: string }) {
  const [submissions, setSubmissions] = useState<SubmissionWithGroup[]>([])
  const [approved, setApproved] = useState<SubmissionWithGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchSubmissions() {
    const groupIds = (await supabase.from('groups').select('id').eq('event_id', eventId)).data?.map(g => g.id) ?? []

    const [{ data: pending }, { data: approvedData }] = await Promise.all([
      supabase
        .from('submissions')
        .select('*, groups(name), checkpoints(title, has_survey, clue_image_url)')
        .eq('status', 'pending')
        .in('group_id', groupIds)
        .order('submitted_at', { ascending: true }),
      supabase
        .from('submissions')
        .select('*, groups(name), checkpoints(title, has_survey, clue_image_url)')
        .eq('status', 'approved')
        .in('group_id', groupIds)
        .order('submitted_at', { ascending: true }),
    ])

    setSubmissions((pending as SubmissionWithGroup[]) ?? [])
    setApproved((approvedData as SubmissionWithGroup[]) ?? [])
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
      // Se il checkpoint ha anche il sondaggio, NON avanzare il gruppo:
      // ci penserà l'invio del sondaggio da parte del partecipante
      const submission = submissions.find(s => s.id === submissionId)
      const hasSurvey = submission?.checkpoints?.has_survey ?? false

      if (!hasSurvey) {
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
    }

    setActionLoading(null)
    fetchSubmissions()
  }

  async function handleDelete(sub: SubmissionWithGroup) {
    if (!confirm(`Eliminare il media di "${sub.groups?.name}"? L'operazione non è reversibile.`)) return
    setDeletingId(sub.id)
    // Rimuovi il file dallo storage
    const urlPath = new URL(sub.media_url).pathname
    const storagePath = urlPath.split('/object/public/media/')[1]
    if (storagePath) {
      await supabase.storage.from('media').remove([storagePath])
    }
    // Rimuovi il record dal DB
    await supabase.from('submissions').delete().eq('id', sub.id)
    setDeletingId(null)
    fetchSubmissions()
  }

  async function downloadAll() {
    setDownloadingAll(true)
    for (const sub of approved) {
      const ext = sub.media_url.split('.').pop()?.split('?')[0] ?? (sub.media_type === 'video' ? 'mp4' : 'jpg')
      const filename = `${sub.groups?.name ?? 'gruppo'}-${sub.checkpoints?.title ?? 'tappa'}.${ext}`
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      downloadFile(sub.media_url, filename)
      // Piccola pausa per non saturare il browser
      await new Promise(r => setTimeout(r, 300))
    }
    setDownloadingAll(false)
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sezione pending */}
      <div>
        {submissions.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Clock size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessun media in attesa di approvazione</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {submissions.map(sub => (
              <div key={sub.id} className="border border-green-300 bg-green-50 rounded-xl p-4 flex gap-4">
                {/* Foto di riferimento del luogo */}
                {sub.checkpoints?.clue_image_url && (
                  <div className="flex-shrink-0">
                    <p className="text-[10px] text-gray-400 mb-1 text-center">Riferimento</p>
                    <a href={sub.checkpoints.clue_image_url} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={sub.checkpoints.clue_image_url}
                        alt="Foto riferimento"
                        width={64}
                        height={64}
                        className="rounded-lg object-cover w-16 h-16 hover:opacity-80 transition-opacity border-2 border-blue-200"
                      />
                    </a>
                  </div>
                )}
                <div className="flex-shrink-0">
                  <p className="text-[10px] text-gray-400 mb-1 text-center">Inviato</p>
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
                  <div className="flex flex-wrap gap-2 mt-3">
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
                    <button
                      onClick={() => {
                        const ext = sub.media_url.split('.').pop()?.split('?')[0] ?? (sub.media_type === 'video' ? 'mp4' : 'jpg')
                        const filename = `${sub.groups?.name ?? 'gruppo'}-${sub.checkpoints?.title ?? 'tappa'}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, '_')
                        downloadFile(sub.media_url, filename)
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download size={13} />
                      Scarica
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Galleria approvati */}
      {approved.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Images size={15} className="text-green-600" />
              Approvati ({approved.length})
            </h3>
            <button
              onClick={downloadAll}
              disabled={downloadingAll}
              className="flex items-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {downloadingAll ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Scarica tutti
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {approved.map(sub => (
              <div key={sub.id} className="relative group">
                {sub.media_type === 'image' ? (
                  <a href={sub.media_url} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={sub.media_url}
                      alt={`${sub.groups?.name} – ${sub.checkpoints?.title}`}
                      width={120}
                      height={120}
                      className="rounded-lg object-cover w-full aspect-square"
                    />
                  </a>
                ) : (
                  <a href={sub.media_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center w-full aspect-square bg-gray-800 rounded-lg text-white text-xs font-medium">
                    ▶ Video
                  </a>
                )}
                {/* Overlay info + download */}
                <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                  <p className="text-white text-[10px] font-semibold text-center leading-tight line-clamp-2">{sub.groups?.name}</p>
                  <p className="text-gray-300 text-[9px] text-center leading-tight line-clamp-1">{sub.checkpoints?.title}</p>
                  <button
                    onClick={() => {
                      const ext = sub.media_url.split('.').pop()?.split('?')[0] ?? (sub.media_type === 'video' ? 'mp4' : 'jpg')
                      const filename = `${sub.groups?.name ?? 'gruppo'}-${sub.checkpoints?.title ?? 'tappa'}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, '_')
                      downloadFile(sub.media_url, filename)
                    }}
                    className="mt-1 flex items-center gap-1 text-[10px] font-semibold bg-white text-gray-900 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors"
                  >
                    <Download size={10} /> Scarica
                  </button>
                  <button
                    onClick={() => handleDelete(sub)}
                    disabled={deletingId === sub.id}
                    className="flex items-center gap-1 text-[10px] font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === sub.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
