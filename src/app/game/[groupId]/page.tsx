'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MapPin, Camera, Loader2, CheckCircle, Clock, XCircle, Upload, Trophy } from 'lucide-react'
import type { Checkpoint, Group, Submission } from '@/lib/types'

export default function GamePage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState('')
  const [group, setGroup] = useState<Group | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [uploading, setUploading] = useState(false)
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    params.then(p => {
      setGroupId(p.groupId)
      init(p.groupId)
    })
  }, [])

  async function init(gid: string) {
    const [{ data: g }, { data: cps }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', gid).single(),
      supabase.from('checkpoints').select('*').order('order_index'),
    ])

    if (!g) { router.push('/'); return }

    setGroup(g)
    const filteredCps = (cps ?? []).filter((c: Checkpoint) => c.event_id === g.event_id)
    setCheckpoints(filteredCps)

    // Carica submission corrente se esiste
    const currentCp = filteredCps[g.current_checkpoint_index]
    if (currentCp) {
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

    // Realtime: ascolta aggiornamenti del gruppo (approvazione media)
    supabase
      .channel(`group-${gid}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'groups',
        filter: `id=eq.${gid}`,
      }, (payload) => {
        const updated = payload.new as Group
        setGroup(updated)
        const newCp = filteredCps[updated.current_checkpoint_index]
        if (newCp?.unlock_message) {
          setUnlockMessage(newCp.unlock_message)
        }
        setSubmission(null)
      })
      .subscribe()
  }

  function startGpsTracking(gid: string) {
    if (!navigator.geolocation) return

    navigator.geolocation.watchPosition(async (pos) => {
      await supabase.from('group_positions').upsert({
        group_id: gid,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'group_id' })
    }, undefined, { enableHighAccuracy: true, maximumAge: 10000 })
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

  async function handleAdvanceWithoutMedia(currentCp: Checkpoint) {
    if (!group) return
    const nextIndex = group.current_checkpoint_index + 1
    const total = checkpoints.length

    await supabase
      .from('groups')
      .update({
        current_checkpoint_index: nextIndex,
        finished: nextIndex >= total,
        finished_at: nextIndex >= total ? new Date().toISOString() : null,
      })
      .eq('id', group.id)

    await supabase.from('group_progress').insert({
      group_id: group.id,
      checkpoint_id: currentCp.id,
    })

    const newGroup = { ...group, current_checkpoint_index: nextIndex, finished: nextIndex >= total }
    setGroup(newGroup)
    const newCp = checkpoints[nextIndex]
    if (newCp?.unlock_message) setUnlockMessage(newCp.unlock_message)
    setSubmission(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50">
        <Loader2 className="animate-spin text-amber-600" size={32} />
      </main>
    )
  }

  if (!group || !checkpoints.length) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50 p-6 text-center">
        <p className="text-gray-500">Evento non trovato o non ancora iniziato.</p>
      </main>
    )
  }

  // Evento completato
  if (group.finished) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Complimenti!</h1>
        <p className="text-amber-700 text-lg mb-1">Hai completato la caccia al tesoro!</p>
        <p className="text-amber-600 text-sm">Siete arrivati alle {group.finished_at ? new Date(group.finished_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
        <div className="mt-8">
          <Trophy className="mx-auto text-amber-500" size={64} />
        </div>
      </main>
    )
  }

  const currentCp = checkpoints[group.current_checkpoint_index]
  const isLastCheckpoint = group.current_checkpoint_index === checkpoints.length - 1

  return (
    <main className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-amber-600 text-white px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-xs opacity-80">Gruppo</p>
            <p className="font-bold">{group.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Tappa</p>
            <p className="font-bold">{group.current_checkpoint_index + 1} / {checkpoints.length}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-2 h-1.5 bg-amber-500 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${((group.current_checkpoint_index) / checkpoints.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 flex flex-col gap-4">

        {/* Messaggio sblocco */}
        {unlockMessage && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-green-800 text-sm mb-0.5">Tappa sbloccata!</p>
              <p className="text-green-700 text-sm">{unlockMessage}</p>
              <button onClick={() => setUnlockMessage(null)} className="text-xs text-green-500 mt-1 underline">Chiudi</button>
            </div>
          </div>
        )}

        {/* Card tappa corrente */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              TAPPA {group.current_checkpoint_index + 1}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{currentCp.title}</h2>

          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <p className="text-sm font-medium text-gray-500 mb-1">🔍 Indizio</p>
            <p className="text-gray-800 leading-relaxed">{currentCp.clue}</p>
          </div>

          {currentCp.clue_image_url && (
            <img
              src={currentCp.clue_image_url}
              alt="Indizio"
              className="w-full rounded-2xl object-cover mb-4 max-h-48"
            />
          )}

          {/* GPS indicator */}
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <MapPin size={13} />
            <span>Posizione GPS condivisa con l&apos;organizzatore</span>
          </div>
        </div>

        {/* Sezione upload media */}
        {currentCp.requires_media && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Camera size={18} className="text-blue-600" />
              Prova richiesta
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Scatta una foto o registra un video per sbloccare la prossima tappa.
            </p>

            {!submission && (
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
              <div className={`rounded-2xl p-4 flex items-center gap-3 ${
                submission.status === 'approved' ? 'bg-green-50 border border-green-200' :
                submission.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                'bg-amber-50 border border-amber-200'
              }`}>
                {submission.status === 'approved' && <CheckCircle className="text-green-600 flex-shrink-0" size={20} />}
                {submission.status === 'rejected' && <XCircle className="text-red-600 flex-shrink-0" size={20} />}
                {submission.status === 'pending' && <Clock className="text-amber-600 flex-shrink-0 animate-pulse" size={20} />}
                <div>
                  <p className={`font-semibold text-sm ${
                    submission.status === 'approved' ? 'text-green-800' :
                    submission.status === 'rejected' ? 'text-red-800' :
                    'text-amber-800'
                  }`}>
                    {submission.status === 'approved' && '✓ Approvato! Tappa sbloccata.'}
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

        {/* Avanza senza media (se non richiesto) */}
        {!currentCp.requires_media && (
          <button
            onClick={() => handleAdvanceWithoutMedia(currentCp)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-2xl transition-colors text-lg"
          >
            {isLastCheckpoint ? '🏁 Sono arrivato! Finisci!' : '➡️ Sono arrivato alla tappa'}
          </button>
        )}
      </div>
    </main>
  )
}
