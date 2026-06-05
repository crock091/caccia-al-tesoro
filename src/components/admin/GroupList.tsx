'use client'

import { useState, useEffect, useRef } from 'react'
import { Copy, Check, QrCode, SkipForward, Loader2, MapPin, ChevronDown, ChevronUp, Trash2, CheckCircle2, Star, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Group, GroupPosition, Feedback, QrScan } from '@/lib/types'

interface ProgressItem {
  checkpoint_id: string
  completed_at: string
  checkpoints: { title: string; order_index: number }
}

export default function GroupList({ groups: initialGroups, totalCheckpoints, eventId }: { groups: Group[]; totalCheckpoints: number; eventId: string }) {
  const [groups, setGroups] = useState(initialGroups)
  const [copied, setCopied] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const expandedIdRef = useRef<string | null>(null)
  const groupsRef = useRef<Group[]>(initialGroups)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [toast, setToast] = useState<{ groupName: string; content: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [progressCache, setProgressCache] = useState<Record<string, ProgressItem[]>>({})
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null)
  const [positions, setPositions] = useState<Record<string, GroupPosition>>({})
  const [feedbackCache, setFeedbackCache] = useState<Record<string, Feedback | null>>({})
  const [qrScansCache, setQrScansCache] = useState<Record<string, Record<string, QrScan>>>({})
  const [surveyLabels, setSurveyLabels] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    setGroups(initialGroups)
    groupsRef.current = initialGroups
  }, [initialGroups])

  // Subscription realtime: aggiorna i gruppi quando i partecipanti avanzano o un admin modifica da un altro client
  useEffect(() => {
    const channel = supabase
      .channel(`groups-event-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'groups' },
        (payload) => {
          if ((payload.new as Group).event_id !== eventId) return
          const updatedGroup = payload.new as Group
          setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
          // Invalida la cache del progresso: il gruppo ha avanzato di tappa
          setProgressCache(prev => {
            if (!prev[updatedGroup.id]) return prev
            const next = { ...prev }
            delete next[updatedGroup.id]
            return next
          })
          // Se il gruppo è attualmente espanso, ricarica il progresso subito
          if (expandedIdRef.current === updatedGroup.id) {
            setLoadingProgress(updatedGroup.id)
            Promise.all([
              supabase.from('group_progress').select('checkpoint_id, completed_at, checkpoints(title, order_index)').eq('group_id', updatedGroup.id),
              supabase.from('feedback').select('*').eq('group_id', updatedGroup.id).maybeSingle(),
              supabase.from('qr_scans').select('*').eq('group_id', updatedGroup.id),
            ]).then(([{ data: prog }, { data: fb }, { data: scans }]) => {
              const sorted = ((prog ?? []) as unknown as ProgressItem[]).sort((a, b) => a.checkpoints.order_index - b.checkpoints.order_index)
              const scansMap: Record<string, QrScan> = {}
              ;(scans ?? []).forEach((s: QrScan) => { scansMap[s.checkpoint_id] = s })
              setProgressCache(prev => ({ ...prev, [updatedGroup.id]: sorted }))
              setFeedbackCache(prev => ({ ...prev, [updatedGroup.id]: fb ?? null }))
              setQrScansCache(prev => ({ ...prev, [updatedGroup.id]: scansMap }))
              setLoadingProgress(null)
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'groups' },
        (payload) => {
          if ((payload.new as Group).event_id !== eventId) return
          setGroups(prev => prev.some(g => g.id === (payload.new as Group).id) ? prev : [...prev, payload.new as Group])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'groups' },
        (payload) => {
          setGroups(prev => prev.filter(g => g.id !== (payload.old as { id: string }).id))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { group_id: string; sender: string; content: string }
          if (msg.sender !== 'group') return
          if (expandedIdRef.current !== msg.group_id) {
            setUnreadCounts(prev => ({ ...prev, [msg.group_id]: (prev[msg.group_id] ?? 0) + 1 }))
            const grp = groupsRef.current.find(g => g.id === msg.group_id)
            if (grp) {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
              setToast({ groupName: grp.name, content: msg.content })
              toastTimerRef.current = setTimeout(() => setToast(null), 4000)
            }
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  useEffect(() => {
    supabase.from('survey_questions').select('id, text').order('order_index').then(({ data }) => {
      if (!data) return
      const map: Record<string, string> = {}
      data.forEach((q: { id: string; text: string }) => { map[q.id] = q.text })
      setSurveyLabels(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (expandedId === groupId) {
      setExpandedId(null)
      expandedIdRef.current = null
      return
    }
    setExpandedId(groupId)
    expandedIdRef.current = groupId
    // Segna i messaggi come letti
    setUnreadCounts(prev => ({ ...prev, [groupId]: 0 }))
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
    // Notifica push al gruppo
    fetch('/api/push/group-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'unlocked',
        groupId: group.id,
        finished,
      }),
    }).catch(() => {})
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
    <>
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
                    {group.name}                    {(unreadCounts[group.id] ?? 0) > 0 && (
                      <span className="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex-shrink-0">
                        {unreadCounts[group.id]}
                      </span>
                    )}                  </p>
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
                      className="p-1.5 text-gray-400 hover:text-green-700 transition-colors rounded disabled:opacity-50"
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
                      'bg-green-500'
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
                  const LEGACY_LABELS: Record<string, string> = {
                    q1: 'Esperienza complessiva', q2: 'Difficoltà indizi',
                    q3: 'Percorso e luoghi', q4: 'Organizzazione',
                    q5: 'Interesse tappe', q6: 'Divertimento di gruppo',
                    q7: 'Durata evento', q8: 'Chiarezza istruzioni',
                    q9: 'Atmosfera giornata', q10: 'Consiglieresti?',
                  }
                  const getLabel = (k: string) => surveyLabels[k] ?? LEGACY_LABELS[k] ?? k
                  const keys = Object.keys(fb.answers)
                  const avg = keys.length
                    ? (keys.reduce((s, k) => s + (fb.answers[k] ?? 0), 0) / keys.length).toFixed(1)
                    : '—'
                  return (
                    <div className="mt-3 pt-3 border-t border-green-100">
                      <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                        <Star size={12} className="fill-green-500 text-green-500" />
                        Valutazione — media {avg}/5
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {keys.map(k => (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 truncate">{getLabel(k)}</span>
                            <span className="flex gap-0.5 ml-1 flex-shrink-0">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={10}
                                  className={s <= (fb.answers[k] ?? 0) ? 'fill-green-500 text-green-500' : 'fill-gray-100 text-gray-200'}
                                />
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                      {fb.message && (
                        <div className="mt-2 bg-green-50 rounded-lg p-2">
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

    {/* Toast notifica messaggio gruppo */}
    {toast && (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)', maxWidth: '280px' }}
      >
        <MessageCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">{toast.groupName}</p>
          <p className="text-xs text-slate-400 truncate">{toast.content}</p>
        </div>
      </div>
    )}
    </>
  )
}
