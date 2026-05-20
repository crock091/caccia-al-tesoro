'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, QrCode, SkipForward, Loader2, MapPin, ChevronDown, ChevronUp, Trash2, CheckCircle2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Group, GroupPosition, Feedback, QrScan } from '@/lib/types'

interface ProgressItem {
  checkpoint_id: string
  completed_at: string
  checkpoints: { title: string; order_index: number }
}

export default function GroupList({ groups: initialGroups, totalCheckpoints }: { groups: Group[]; totalCheckpoints: number }) {
  const [groups, setGroups] = useState(initialGroups)
  const [copied, setCopied] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [progressCache, setProgressCache] = useState<Record<string, ProgressItem[]>>({})
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null)
  const [positions, setPositions] = useState<Record<string, GroupPosition>>({})
  const [feedbackCache, setFeedbackCache] = useState<Record<string, Feedback | null>>({})
  const [qrScansCache, setQrScansCache] = useState<Record<string, Record<string, QrScan>>>({})
  const supabase = createClient()

  useEffect(() => { setGroups(initialGroups) }, [initialGroups])

  useEffect(() => {
    const issueGroupIds = groups.filter(g => g.qr_issue_reported).map(g => g.id)
    if (!issueGroupIds.length) return
    supabase
      .from('group_positions')
      .select('*')
      .in('group_id', issueGroupIds)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, GroupPosition> = {}
        data.forEach(p => { map[p.group_id] = p })
        setPositions(map)
      })
  }, [groups])

  function copyLink(code: string) {
    const url = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  async function toggleExpand(groupId: string) {
    if (expandedId === groupId) { setExpandedId(null); return }
    setExpandedId(groupId)
    if (progressCache[groupId]) return
    setLoadingProgress(groupId)
    const [{ data: prog }, { data: fb }, { data: scans }] = await Promise.all([
      supabase
        .from('group_progress')
        .select('checkpoint_id, completed_at, checkpoints(title, order_index)')
        .eq('group_id', groupId),
      supabase
        .from('feedback')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle(),
      supabase
        .from('qr_scans')
        .select('*')
        .eq('group_id', groupId),
    ])
    const sorted = ((prog ?? []) as unknown as ProgressItem[]).sort((a: ProgressItem, b: ProgressItem) =>
      a.checkpoints.order_index - b.checkpoints.order_index
    )
    // Mappa checkpoint_id -> qr_scan
    const scansMap: Record<string, QrScan> = {}
    ;(scans ?? []).forEach((s: QrScan) => { scansMap[s.checkpoint_id] = s })
    setProgressCache(prev => ({ ...prev, [groupId]: sorted }))
    setFeedbackCache(prev => ({ ...prev, [groupId]: fb ?? null }))
    setQrScansCache(prev => ({ ...prev, [groupId]: scansMap }))
    setLoadingProgress(null)
  }

  async function handleManualAdvance(e: React.MouseEvent, group: Group) {
    e.stopPropagation()
    if (!confirm(`Sbloccare manualmente "${group.name}" alla tappa successiva?`)) return
    setAdvancing(group.id)
    const nextIndex = group.current_checkpoint_index + 1
    const finished = nextIndex >= totalCheckpoints
    const now = new Date().toISOString()
    await supabase
      .from('groups')
      .update({ current_checkpoint_index: nextIndex, finished, finished_at: finished ? now : null, qr_issue_reported: false })
      .eq('id', group.id)
    setGroups(prev => prev.map(g =>
      g.id === group.id
        ? { ...g, current_checkpoint_index: nextIndex, finished, finished_at: finished ? now : null, qr_issue_reported: false }
        : g
    ))
    setAdvancing(null)
  }

  async function handleDelete(e: React.MouseEvent, group: Group) {
    e.stopPropagation()
    if (!confirm(`Eliminare "${group.name}" e tutti i suoi dati? L'operazione è irreversibile.`)) return
    setDeleting(group.id)
    await supabase.from('groups').delete().eq('id', group.id)
    setGroups(prev => prev.filter(g => g.id !== group.id))
    setDeleting(null)
  }

  if (!groups.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Nessun gruppo ancora. Aggiungine uno!</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map(group => {
        const progress = totalCheckpoints > 0
          ? Math.round((group.current_checkpoint_index / totalCheckpoints) * 100)
          : 0
        const isExpanded = expandedId === group.id
        const groupProgress = progressCache[group.id] ?? []

        const groupQrScans = qrScansCache[group.id] ?? {}

        return (
          <li
            key={group.id}
            className={`border rounded-xl overflow-hidden ${
              group.qr_issue_reported ? 'border-red-300 bg-red-50' : 'border-gray-100'
            }`}
          >
            {/* Header cliccabile */}
            <div
              onClick={() => toggleExpand(group.id)}
              className="w-full text-left p-3 cursor-pointer"
            >
              {group.qr_issue_reported && (
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                    <QrCode size={13} />
                    QR non trovato — sblocco manuale richiesto
                  </div>
                  {positions[group.id] ? (
                    <a
                      href={`https://www.google.com/maps?q=${positions[group.id].latitude},${positions[group.id].longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-blue-600 underline w-fit"
                    >
                      <MapPin size={11} />
                      Vedi posizione GPS ({new Date(positions[group.id].updated_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })})
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Posizione GPS non disponibile</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 flex items-center gap-1">
                    {isExpanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
                    {group.name}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5 pl-[18px]">Codice: {group.invite_code}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {group.finished ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Finito</span>
                  ) : (
                    <span className="text-xs text-gray-500">{group.current_checkpoint_index}/{totalCheckpoints}</span>
                  )}
                  {!group.finished && (
                    <button
                      onClick={e => handleManualAdvance(e, group)}
                      disabled={advancing === group.id}
                      className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors rounded disabled:opacity-50"
                      title="Sblocca manualmente"
                    >
                      {advancing === group.id ? <Loader2 size={14} className="animate-spin" /> : <SkipForward size={14} />}
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); copyLink(group.invite_code) }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded"
                    title="Copia link invito"
                  >
                    {copied === group.invite_code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={e => handleDelete(e, group)}
                    disabled={deleting === group.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded disabled:opacity-50"
                    title="Elimina gruppo"
                  >
                    {deleting === group.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {totalCheckpoints > 0 && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      group.finished ? 'bg-green-500' :
                      group.qr_issue_reported ? 'bg-red-400' :
                      'bg-amber-500'
                    }`}
                    style={{ width: `${group.finished ? 100 : progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Dettaglio tappe completate */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-3 py-3">
                {loadingProgress === group.id ? (
                  <div className="flex justify-center py-2">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  </div>
                ) : groupProgress.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-1">Nessuna tappa completata</p>
                ) : (
                  <ol className="flex flex-col gap-1.5">
                    {groupProgress.map((p, i) => {
                        const scan = groupQrScans[p.checkpoint_id]
                        return (
                          <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                            <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                            <span className="font-medium">{p.checkpoints.title}</span>
                            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                              {scan?.latitude != null && scan?.longitude != null ? (
                                <a
                                  href={`https://www.google.com/maps?q=${scan.latitude},${scan.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-0.5 text-blue-500 hover:text-blue-700 underline"
                                  title={`Precisione: ${scan.accuracy != null ? Math.round(scan.accuracy) + 'm' : 'n/d'}`}
                                >
                                  <MapPin size={11} />
                                  GPS
                                </a>
                              ) : (
                                <span className="text-gray-300 flex items-center gap-0.5"><MapPin size={11} />—</span>
                              )}
                              <span className="text-gray-400">
                                {new Date(p.completed_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </li>
                        )
                      })}
                  </ol>
                )}
                {group.finished && group.finished_at && (
                  <p className="text-xs text-green-600 font-medium mt-2 text-center">
                    🏁 Completato alle {new Date(group.finished_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {/* Feedback sondaggio */}
                {feedbackCache[group.id] && (() => {
                  const fb = feedbackCache[group.id]!
                  const LABELS: Record<string, string> = {
                    q1: 'Esperienza complessiva', q2: 'Difficoltà indizi',
                    q3: 'Percorso e luoghi', q4: 'Organizzazione',
                    q5: 'Interesse tappe', q6: 'Divertimento di gruppo',
                    q7: 'Durata evento', q8: 'Chiarezza istruzioni',
                    q9: 'Atmosfera giornata', q10: 'Consiglieresti?',
                  }
                  const keys = Object.keys(fb.answers).sort()
                  const avg = keys.length
                    ? (keys.reduce((s, k) => s + (fb.answers[k] ?? 0), 0) / keys.length).toFixed(1)
                    : '—'
                  return (
                    <div className="mt-3 pt-3 border-t border-violet-100">
                      <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1">
                        <Star size={12} className="fill-violet-500 text-violet-500" />
                        Valutazione — media {avg}/5
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {keys.map(k => (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 truncate">{LABELS[k] ?? k}</span>
                            <span className="flex gap-0.5 ml-1 flex-shrink-0">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={10}
                                  className={s <= (fb.answers[k] ?? 0) ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'}
                                />
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                      {fb.message && (
                        <div className="mt-2 bg-violet-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 mb-0.5 font-medium">Commento:</p>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">{fb.message}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-300 mt-1">
                        Inviato {new Date(fb.created_at).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
