'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MapPin, Camera, Loader2, CheckCircle, Clock, XCircle, Upload, Trophy, QrCode } from 'lucide-react'
import PoweredByFooter from '@/components/PoweredByFooter'
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
        const newQrRequired = newCp ? (newCp.requires_qr ?? true) : true
        setQrVerified(newCp ? (!newQrRequired || !!localStorage.getItem('qr_verified_' + newCp.id)) : false)
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
      // Se la tappa non richiede QR, lo consideriamo già verificato
      const qrRequired = currentCp.requires_qr ?? true
      setQrVerified(!qrRequired || !!localStorage.getItem('qr_verified_' + currentCp.id))
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
    // Notifica push all'admin
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'survey_submitted',
        groupId: group.id,
        groupName: group.name,
      }),
    }).catch(() => {})
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
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0b0f19' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#6DAB3C' }} />
      </main>
    )
  }

  if (!group || !checkpoints.length) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center" style={{ backgroundColor: '#0b0f19' }}>
        <p className="text-slate-400">Evento non trovato o non ancora iniziato.</p>
      </main>
    )
  }

  // Evento completato
  if (group.finished) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
        style={{
          backgroundColor: '#0b0f19',
          backgroundImage: `url('/game-bg.png')`,
          backgroundSize: 'auto 100vh',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(5,10,15,0.72)', zIndex: 0 }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-white rounded-2xl p-3 mb-6 shadow-lg">
            <Image src="/Logo-sito-poll.avif" alt="Logo" width={100} height={100} />
          </div>
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-5xl"
            style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', boxShadow: '0 20px 60px rgba(109,171,60,0.45)' }}
          >
            🎉
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Complimenti!</h1>
          <p className="text-lg mb-1" style={{ color: '#6DAB3C' }}>Hai completato la caccia al tesoro!</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Siete arrivati alle {group.finished_at ? new Date(group.finished_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
          <div className="mt-8">
            <Trophy className="mx-auto" style={{ color: '#6DAB3C' }} size={64} />
          </div>
          <PoweredByFooter dark />
        </div>
      </main>
    )
  }

  const currentCp = checkpoints[group.current_checkpoint_index]
  const isLastCheckpoint = group.current_checkpoint_index === checkpoints.length - 1

  return (
    <main
      className="min-h-screen relative"
      style={{
        backgroundColor: '#0b0f19',
        backgroundImage: `url('/game-bg.png')`,
        backgroundSize: 'auto 100vh',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay scuro per leggibilità */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(5,10,15,0.72)', zIndex: 0 }} />
      {/* Header gruppo + logo */}
      <div className="relative z-10 px-5 py-3" style={{ borderBottom: '1px solid rgba(109, 171, 60, 0.2)', background: 'rgba(5,10,15,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-[400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Gruppo</p>
            <p className="font-semibold text-white text-sm leading-tight mb-1.5">{group.name}</p>
            <div className="flex items-center gap-2">
              <div className="h-0.5 rounded-full overflow-hidden" style={{ width: '80px', background: 'rgba(109, 171, 60, 0.1)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${((group.current_checkpoint_index) / checkpoints.length) * 100}%`, background: 'linear-gradient(90deg, #6DAB3C, #206134)' }}
                />
              </div>
              <p className="text-xs font-semibold leading-none">
                <span style={{ color: '#6DAB3C' }}>{group.current_checkpoint_index + 1}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>/{checkpoints.length}</span>
                <span className="ml-1 text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>tappa</span>
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-2 shadow-lg flex-shrink-0">
            <Image src="/Logo-sito-poll.avif" alt="Logo" width={72} height={72} />
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[400px] mx-auto px-5 pt-6 pb-28 flex flex-col gap-6">

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
        <div className="rounded-[20px] p-[22px]" style={{ background: 'rgba(11,15,25,0.88)', border: '1px solid rgba(109, 171, 60, 0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-widest" style={{ background: 'rgba(109, 171, 60, 0.12)', color: '#6DAB3C' }}>
            Tappa {group.current_checkpoint_index + 1}
          </span>
          <h2 className="font-black text-white mb-4" style={{ fontSize: '2.4rem', letterSpacing: '-1px', lineHeight: '1.05' }}>{currentCp.title}</h2>

          <div className="p-4 mb-4 rounded-r-xl" style={{ borderLeft: '3px solid #6DAB3C' }}>
            <p className="flex items-center gap-1.5 text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6DAB3C' }}>
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              Indizio
            </p>
            <p className="text-white font-semibold leading-snug">{currentCp.clue}</p>
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
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8899a6' }}>
              <MapPin size={13} style={{ color: '#6DAB3C' }} />
              <span>Posizione GPS condivisa con l&apos;organizzatore</span>
            </div>
          )}
          {gpsStatus === 'waiting' && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8899a6' }}>
              <MapPin size={13} style={{ color: 'rgba(109,171,60,0.5)' }} />
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
          <div className="rounded-[20px] p-[22px]" style={{ background: 'rgba(11,15,25,0.88)', border: '1px solid rgba(109, 171, 60, 0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
              <Camera size={18} style={{ color: '#6DAB3C' }} />
              Prova richiesta
            </h3>
            <p className="text-sm mb-4" style={{ color: '#8899a6' }}>
              Scatta una foto o registra un video per sbloccare la prossima tappa.
            </p>

            {!submission && !qrVerified && (currentCp.requires_qr ?? true) && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-20 h-20 flex items-center justify-center rounded-[18px] mb-1" style={{ border: '2px dashed rgba(109, 171, 60, 0.3)' }}>
                  <QrCode size={38} style={{ color: 'rgba(109, 171, 60, 0.4)' }} />
                </div>
                <p className="text-sm" style={{ color: '#8899a6' }}>
                  Scansiona il QR della tappa per sbloccare l&apos;upload.
                </p>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 font-semibold px-5 py-3 rounded-full text-sm transition-opacity active:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#0b0f19', boxShadow: '0 6px 20px rgba(109,171,60,0.3)' }}
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
                  className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-full transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#0b0f19', boxShadow: '0 6px 20px rgba(109,171,60,0.3)' }}
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

        {/* Sondaggio di valutazione (has_survey=true) — overlay full-screen animato */}
        {currentCp.has_survey && qrVerified && !surveySubmitted &&
          (!currentCp.requires_media || submission?.status === 'approved') && (
          <div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ animation: 'fadeIn 0.25s ease both', background: 'rgba(5,10,15,0.85)', backdropFilter: 'blur(6px)' }}
          >
            <div
              className="mt-auto w-full max-h-[92vh] overflow-y-auto rounded-t-[28px]"
              style={{
                animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                background: '#0b0f19',
                border: '1px solid rgba(109,171,60,0.25)',
                borderBottom: 'none',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
              </div>
              <div className="px-5 pb-8">
                <SurveyForm questions={surveyQuestions} onSubmit={handleSurveySubmit} />
              </div>
            </div>
          </div>
        )}

        {/* Tappa con sondaggio ma QR non ancora scansionato (solo se non richiede media e richiede QR) */}
        {currentCp.has_survey && !currentCp.requires_media && !qrVerified && (currentCp.requires_qr ?? true) && (
          <div className="rounded-[20px] p-[22px] flex flex-col items-center gap-3 text-center" style={{ background: 'rgba(11,15,25,0.88)', border: '1px solid rgba(109, 171, 60, 0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div className="text-4xl">🌟</div>
            <p className="font-semibold text-white">Sei all&apos;ultima tappa!</p>
            <p className="text-sm" style={{ color: '#8899a6' }}>
              Scansiona il QR per accedere al sondaggio di fine giornata.
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 font-semibold px-5 py-3 rounded-full text-sm transition-opacity active:opacity-70"
              style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#0b0f19', boxShadow: '0 6px 20px rgba(109,171,60,0.3)' }}
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

        {/* Tappa QR-only (nessun media, nessun sondaggio, richiede QR): richiede la scansione del QR */}
        {!currentCp.requires_media && !currentCp.has_survey && (currentCp.requires_qr ?? true) && (
          <div className="rounded-[20px] p-[22px] flex flex-col items-center gap-3 text-center" style={{ background: 'rgba(11,15,25,0.88)', border: '1px solid rgba(109, 171, 60, 0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div className="w-20 h-20 flex items-center justify-center rounded-[18px] mb-1" style={{ border: '2px dashed rgba(109, 171, 60, 0.3)' }}>
              <QrCode size={38} style={{ color: 'rgba(109, 171, 60, 0.4)' }} />
            </div>
            <p className="font-semibold text-white">
              {isLastCheckpoint ? '🏁 Scansiona il QR per concludere!' : 'Scansiona il QR per avanzare'}
            </p>
            <p className="text-sm" style={{ color: '#8899a6' }}>
              Inquadra il codice QR della tappa con la fotocamera.
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 font-semibold px-5 py-3 rounded-full text-sm transition-opacity active:opacity-70"
              style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#0b0f19', boxShadow: '0 6px 20px rgba(109,171,60,0.3)' }}
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

        {groupId && <GroupChatWidget groupId={groupId} groupName={group?.name} />}
      </div>

      <PoweredByFooter dark />

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
