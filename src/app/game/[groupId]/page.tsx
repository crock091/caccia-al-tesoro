'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MapPin, Camera, Loader2, CheckCircle, Clock, XCircle, Upload, Trophy, QrCode } from 'lucide-react'
import type { Checkpoint, Group, Submission, SurveyQuestion } from '@/lib/types'

const QrScannerModal = dynamic(() => import('@/components/QrScannerModal'), { ssr: false })
const SurveyForm = dynamic(() => import('@/components/SurveyForm'), { ssr: false })
const GroupChatWidget = dynamic(() => import('@/components/GroupChatWidget'), { ssr: false })

export default function GamePage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState('')
  const [group, setGroup] = useState<Group | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [uploading, setUploading] = useState(false)
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [gpsStatus, setGpsStatus] = useState<'waiting' | 'active' | 'denied' | 'unavailable'>('waiting')
  const [qrVerified, setQrVerified] = useState(false)
  const [reportingQr, setReportingQr] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [surveySubmitted, setSurveySubmitted] = useState(false)
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const checkpointsRef = useRef<Checkpoint[]>([])
  const lastPositionRef = useRef<{ latitude: number; longitude: number; accuracy: number | null } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    params.then(p => {
      setGroupId(p.groupId)
      init(p.groupId)
    })
  }, [])

  // Subscription Realtime separata con cleanup (evita doppie iscrizioni in StrictMode)
  useEffect(() => {
    if (!groupId) return

    // Nome univoco per evitare collisioni se StrictMode fa unmount+remount
    // prima che removeChannel asincrono completi
    const channelName = `group-${groupId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'groups',
        filter: `id=eq.${groupId}`,
      }, (payload) => {
        const updated = payload.new as Group
        setGroup(updated)
        const newCp = checkpointsRef.current[updated.current_checkpoint_index]
        if (newCp?.unlock_message) {
          setUnlockMessage(newCp.unlock_message)
        }
        // Verifica QR per la nuova tappa
        setQrVerified(newCp ? !!localStorage.getItem('qr_verified_' + newCp.id) : false)
        setSubmission(null)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  async function init(gid: string) {
    const [{ data: g }, { data: cps }, { data: sqData }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', gid).single(),
      supabase.from('checkpoints').select('*').order('order_index'),
      supabase.from('survey_questions').select('*').eq('active', true).order('order_index'),
    ])

    if (!g) { router.push('/'); return }

    setGroup(g)
    setSurveyQuestions(sqData ?? [])
    const filteredCps = (cps ?? []).filter((c: Checkpoint) => c.event_id === g.event_id)
    setCheckpoints(filteredCps)
    checkpointsRef.current = filteredCps

    // Controlla se QR è già stato scansionato per la tappa corrente
    const currentCp = filteredCps[g.current_checkpoint_index]
    if (currentCp) {
      setQrVerified(!!localStorage.getItem('qr_verified_' + currentCp.id))
      // Controlla se il feedback è già stato inviato per questa tappa
      if (currentCp.has_survey) {
        const { data: fb } = await supabase
          .from('feedback')
          .select('id')
          .eq('group_id', gid)
          .eq('checkpoint_id', currentCp.id)
          .maybeSingle()
        setSurveySubmitted(!!fb)
      }
      const { data: sub } = await supabase
        .from('submissions')
        .select('*')
        .eq('group_id', gid)
        .eq('checkpoint_id', currentCp.id)
        .maybeSingle()
      setSubmission(sub)
    }

    setLoading(false)
    startGpsTracking(gid)
  }

  function startGpsTracking(gid: string) {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      return
    }

    navigator.geolocation.watchPosition(
      async (pos) => {
        setGpsStatus('active')
        lastPositionRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        }
        await supabase.from('group_positions').upsert({
          group_id: gid,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'group_id' })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied')
        } else {
          setGpsStatus('unavailable')
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !group) return

    const currentCp = checkpoints[group.current_checkpoint_index]
    if (!currentCp) return

    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${group.id}/${currentCp.id}.${ext}`
    const mediaType = file.type.startsWith('video') ? 'video' : 'image'

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert('Errore upload. Riprova.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)

    const { data: sub } = await supabase
      .from('submissions')
      .upsert({
        group_id: group.id,
        checkpoint_id: currentCp.id,
        media_url: publicUrl,
        media_type: mediaType,
        status: 'pending',
      }, { onConflict: 'group_id,checkpoint_id' })
      .select()
      .single()

    setSubmission(sub)
    setUploading(false)

    // Notifica admin
    if (sub) {
      fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_submission', groupId: group.id, groupName: group.name }),
      }).catch(() => {})
    }

    // Realtime su submissions per aggiornare stato
    supabase
      .channel(`submission-${sub?.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'submissions',
        filter: `id=eq.${sub?.id}`,
      }, (payload) => {
        setSubmission(payload.new as Submission)
      })
      .subscribe()
  }

  async function handleSurveySubmit(answers: Record<string, number>, message: string) {
    if (!group) return
    const currentCp = checkpoints[group.current_checkpoint_index]
    if (!currentCp) return

    await supabase.from('feedback').upsert({
      group_id: group.id,
      checkpoint_id: currentCp.id,
      event_id: group.event_id,
      answers,
      message: message || null,
    }, { onConflict: 'group_id,checkpoint_id' })

    setSurveySubmitted(true)
    // Avanza il gruppo
    await handleAdvanceWithoutMedia(currentCp)
  }

  async function handleQrScan(decodedText: string) {
    setShowScanner(false)
    // Estrai il token dall'URL scansionato (es. https://domain.com/scan/uuid)
    const match = decodedText.match(/\/scan\/([0-9a-f-]{36})/i)
    if (!match) {
      alert('QR non riconosciuto. Assicurati di inquadrare il codice QR giusto.')
      return
    }
    const token = match[1]

    const { data: cp } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('qr_token', token)
      .single()

    if (!cp || !group) {
      alert('QR non valido.')
      return
    }

    const currentCpLocal = checkpoints[group.current_checkpoint_index]
    if (cp.id !== currentCpLocal?.id) {
      alert('Questo non è il QR della tappa attuale!')
      return
    }

    // Salva posizione al momento della scansione
    const pos = lastPositionRef.current
    await supabase.from('qr_scans').upsert({
      group_id: group.id,
      checkpoint_id: cp.id,
      event_id: cp.event_id,
      latitude: pos?.latitude ?? null,
      longitude: pos?.longitude ?? null,
      accuracy: pos?.accuracy ?? null,
    }, { onConflict: 'group_id,checkpoint_id' })

    if (cp.has_survey) {
      // Tappa con sondaggio: sblocca QR ma non avanzare — il sondaggio lo fa
      localStorage.setItem('qr_verified_' + cp.id, '1')
      setQrVerified(true)
    } else if (cp.requires_media) {
      localStorage.setItem('qr_verified_' + cp.id, '1')
      setQrVerified(true)
    } else {
      await handleAdvanceWithoutMedia(cp)
      setQrVerified(false)
    }
  }

  async function handleReportQrIssue() {
    if (!group) return
    setReportingQr(true)
    await supabase
      .from('groups')
      .update({ qr_issue_reported: true })
      .eq('id', group.id)
    setReportingQr(false)

    // Notifica admin
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'qr_issue', groupId: group.id, groupName: group.name }),
    }).catch(() => {})
  }

  async function handleAdvanceWithoutMedia(currentCp: Checkpoint) {
    if (!group) return
    const nextIndex = group.current_checkpoint_index + 1
    const total = checkpoints.length
    const finished = nextIndex >= total

    await supabase
      .from('groups')
      .update({
        current_checkpoint_index: nextIndex,
        finished,
        finished_at: finished ? new Date().toISOString() : null,
      })
      .eq('id', group.id)

    await supabase.from('group_progress').insert({
      group_id: group.id,
      checkpoint_id: currentCp.id,
    })

    // Notifica admin
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checkpoint',
        groupId: group.id,
        groupName: group.name,
        checkpointTitle: currentCp.title,
        finished,
      }),
    }).catch(() => {})

    const newGroup = { ...group, current_checkpoint_index: nextIndex, finished }
    setGroup(newGroup)
    const newCp = checkpoints[nextIndex]
    if (newCp?.unlock_message) setUnlockMessage(newCp.unlock_message)
    setSubmission(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </main>
    )
  }

  if (!group || !checkpoints.length) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-center">
        <p className="text-slate-400">Evento non trovato o non ancora iniziato.</p>
      </main>
    )
  }

  // Evento completato
  if (group.finished) {
    return (
      <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6 text-6xl"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 20px 60px rgba(234,88,12,0.45)' }}
        >
          🎉
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Complimenti!</h1>
        <p className="text-amber-300 text-lg mb-1">Hai completato la caccia al tesoro!</p>
        <p className="text-slate-400 text-sm">Siete arrivati alle {group.finished_at ? new Date(group.finished_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
        <div className="mt-8">
          <Trophy className="mx-auto text-amber-400" size={64} />
        </div>
      </main>
    )
  }

  const currentCp = checkpoints[group.current_checkpoint_index]
  const isLastCheckpoint = group.current_checkpoint_index === checkpoints.length - 1

  return (
    <main className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="text-white px-4 py-3" style={{ background: 'linear-gradient(135deg, #d97706, #ea580c)', boxShadow: '0 4px 20px rgba(234,88,12,0.25)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-xs opacity-70">Gruppo</p>
            <p className="font-bold">{group.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Tappa</p>
            <p className="font-bold">{group.current_checkpoint_index + 1} / {checkpoints.length}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${((group.current_checkpoint_index) / checkpoints.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 flex flex-col gap-4">

        {/* Messaggio sblocco */}
        {unlockMessage && (
          <div className="rounded-2xl p-4 flex gap-3 items-start" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-green-300 text-sm mb-0.5">Tappa sbloccata!</p>
              <p className="text-green-400 text-sm">{unlockMessage}</p>
              <button onClick={() => setUnlockMessage(null)} className="text-xs text-green-500 mt-1 underline">Chiudi</button>
            </div>
          </div>
        )}

        {/* Card tappa corrente */}
        <div className="rounded-3xl p-6" style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.12)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)' }}>
              TAPPA {group.current_checkpoint_index + 1}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-3">{currentCp.title}</h2>

          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(148,163,184,0.08)' }}>
            <p className="text-sm font-medium text-slate-400 mb-1">🔍 Indizio</p>
            <p className="text-slate-200 leading-relaxed">{currentCp.clue}</p>
          </div>

          {currentCp.clue_image_url && (
            <img
              src={currentCp.clue_image_url}
              alt="Indizio"
              className="w-full rounded-2xl object-cover mb-4 max-h-48"
            />
          )}

          {/* GPS indicator */}
          {gpsStatus === 'active' && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <MapPin size={13} />
              <span>Posizione GPS condivisa con l&apos;organizzatore</span>
            </div>
          )}
          {gpsStatus === 'waiting' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <MapPin size={13} />
              <span>In attesa del permesso GPS…</span>
            </div>
          )}
          {gpsStatus === 'denied' && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <MapPin size={13} />
              <span>GPS negato — vai in Impostazioni e consenti la posizione per questa pagina</span>
            </div>
          )}
          {gpsStatus === 'unavailable' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={13} />
              <span>GPS non disponibile su questo dispositivo</span>
            </div>
          )}
        </div>

        {/* Sezione upload media */}
        {currentCp.requires_media && (
          <div className="rounded-3xl p-6" style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.12)' }}>
            <h3 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <Camera size={18} className="text-blue-400" />
              Prova richiesta
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Scatta una foto o registra un video per sbloccare la prossima tappa.
            </p>

            {!submission && !qrVerified && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <QrCode size={40} className="text-slate-600" />
                <p className="text-sm text-slate-400">
                  Scansiona il QR della tappa per sbloccare l&apos;upload.
                </p>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-2xl transition-colors"
                >
                  <Camera size={17} /> Apri fotocamera
                </button>
                {!group?.qr_issue_reported ? (
                  <button
                    onClick={handleReportQrIssue}
                    disabled={reportingQr}
                    className="text-xs text-red-500 underline disabled:opacity-50"
                  >
                    {reportingQr ? 'Segnalazione inviata…' : 'QR non trovato? Segnalalo all’organizzatore'}
                  </button>
                ) : (
                  <p className="text-xs text-red-500 font-medium">
                    ⚠️ Segnalazione inviata — attendi che l&apos;organizzatore ti sblocchi
                  </p>
                )}
              </div>
            )}

            {!submission && qrVerified && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-colors"
                >
                  {uploading ? (
                    <><Loader2 size={18} className="animate-spin" /> Caricamento...</>
                  ) : (
                    <><Upload size={18} /> Carica foto / video</>
                  )}
                </button>
              </>
            )}

            {submission && (
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={submission.status === 'approved'
                  ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
                  : submission.status === 'rejected'
                  ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
                  : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                {submission.status === 'approved' && <CheckCircle className="text-green-400 flex-shrink-0" size={20} />}
                {submission.status === 'rejected' && <XCircle className="text-red-400 flex-shrink-0" size={20} />}
                {submission.status === 'pending' && <Clock className="text-amber-400 flex-shrink-0 animate-pulse" size={20} />}
                <div>
                  <p className={`font-semibold text-sm ${
                    submission.status === 'approved' ? 'text-green-300' :
                    submission.status === 'rejected' ? 'text-red-300' :
                    'text-amber-300'
                  }`}>
                    {submission.status === 'approved' && (currentCp.has_survey ? '✓ Approvato! Compila il sondaggio qui sotto.' : '✓ Approvato! Tappa sbloccata.')}
                    {submission.status === 'rejected' && 'Rifiutato. Riprova!'}
                    {submission.status === 'pending' && 'In attesa di approvazione...'}
                  </p>
                  {submission.status === 'rejected' && (
                    <button
                      onClick={() => { setSubmission(null) }}
                      className="text-xs text-red-600 underline mt-1"
                    >
                      Ricarica media
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sondaggio di valutazione (has_survey=true) */}
        {currentCp.has_survey && qrVerified && !surveySubmitted &&
          (!currentCp.requires_media || submission?.status === 'approved') && (
          <SurveyForm questions={surveyQuestions} onSubmit={handleSurveySubmit} />
        )}

        {/* Tappa con sondaggio ma QR non ancora scansionato (solo se non richiede media: in quel caso il QR prompt è già nella sezione upload) */}
        {currentCp.has_survey && !currentCp.requires_media && !qrVerified && (
          <div className="rounded-3xl p-6 flex flex-col items-center gap-3 text-center" style={{ background: '#1e293b', border: '1px solid rgba(167,139,250,0.2)' }}>
            <div className="text-4xl">🌟</div>
            <p className="font-semibold text-slate-100">Sei all&apos;ultima tappa!</p>
            <p className="text-sm text-slate-400">
              Scansiona il QR per accedere al sondaggio di fine giornata.
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-2xl transition-colors"
            >
              <Camera size={17} /> Apri fotocamera
            </button>
            {!group?.qr_issue_reported ? (
              <button
                onClick={handleReportQrIssue}
                disabled={reportingQr}
                className="text-xs text-red-500 underline disabled:opacity-50"
              >
                {reportingQr ? 'Segnalazione inviata…' : "QR non trovato? Segnalalo all'organizzatore"}
              </button>
            ) : (
              <p className="text-xs text-red-500 font-medium">
                ⚠️ Segnalazione inviata — attendi che l&apos;organizzatore ti sblocchi
              </p>
            )}
          </div>
        )}

        {/* Tappa QR-only (nessun media, nessun sondaggio): richiede la scansione del QR */}
        {!currentCp.requires_media && !currentCp.has_survey && (
          <div className="rounded-3xl p-6 flex flex-col items-center gap-3 text-center" style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.12)' }}>
            <QrCode size={42} className="text-amber-400" />
            <p className="font-semibold text-slate-100">
              {isLastCheckpoint ? '🏁 Scansiona il QR per concludere!' : 'Scansiona il QR per avanzare'}
            </p>
            <p className="text-sm text-slate-400">
              Inquadra il codice QR della tappa con la fotocamera.
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-2xl transition-colors"
            >
              <Camera size={17} /> Apri fotocamera
            </button>
            {!group?.qr_issue_reported ? (
              <button
                onClick={handleReportQrIssue}
                disabled={reportingQr}
                className="text-xs text-red-500 underline disabled:opacity-50"
              >
                {reportingQr ? 'Segnalazione inviata…' : "QR non trovato? Segnalalo all'organizzatore"}
              </button>
            ) : (
              <p className="text-xs text-red-500 font-medium">
                ⚠️ Segnalazione inviata — attendi che l&apos;organizzatore ti sblocchi
              </p>
            )}
          </div>
        )}

        {groupId && <GroupChatWidget groupId={groupId} />}
      </div>

      {/* Modal scanner QR */}
      {showScanner && (
        <QrScannerModal
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </main>
  )
}
