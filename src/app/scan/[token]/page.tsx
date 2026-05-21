'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, XCircle, Camera, MapPin } from 'lucide-react'
import type { Checkpoint, Group } from '@/lib/types'

type ScanState =
  | 'loading'
  | 'wrong_checkpoint'   // il gruppo è a una tappa diversa
  | 'needs_media'        // tappa corretta ma richiede foto/video
  | 'needs_survey'       // tappa con sondaggio — torna alla game page
  | 'advancing'          // avanzamento in corso
  | 'success'            // avanzato con successo
  | 'finished'           // percorso completato
  | 'no_group'           // nessun group_id in localStorage
  | 'not_found'          // token QR non trovato

export default function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const [state, setState] = useState<ScanState>('loading')
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    params.then(p => handleScan(p.token))
  }, [])

  async function handleScan(token: string) {
    // Recupera group_id da localStorage
    const groupId = localStorage.getItem('group_id')
    if (!groupId) {
      setState('no_group')
      return
    }

    // Trova il checkpoint tramite qr_token
    const { data: cp } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('qr_token', token)
      .single()

    if (!cp) {
      setState('not_found')
      return
    }
    setCheckpoint(cp)

    // Trova il gruppo e l'evento
    const { data: g } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (!g) {
      setState('no_group')
      return
    }
    setGroup(g)

    // Verifica che i checkpoints dell'evento siano ordinati
    const { data: cps } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('event_id', g.event_id)
      .order('order_index')

    if (!cps) {
      setState('not_found')
      return
    }

    const currentCpId = cps[g.current_checkpoint_index]?.id
    if (currentCpId !== cp.id) {
      setState('wrong_checkpoint')
      return
    }

    // Tappa corretta
    if (cp.requires_media) {
      // Segna che il QR è stato scansionato per questa tappa
      localStorage.setItem('qr_verified_' + cp.id, '1')
      // Notifica admin che il QR è stato trovato (media richiesta)
      fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkpoint',
          groupId: g.id,
          groupName: g.name,
          checkpointTitle: cp.title,
          finished: false,
        }),
      }).catch(() => {})
      setState('needs_media')
      return
    }

    // Tappa con sondaggio (e nessun media) → torna alla game page per compilare
    if (cp.has_survey) {
      localStorage.setItem('qr_verified_' + cp.id, '1')
      // Notifica admin che il QR è stato trovato (sondaggio da compilare)
      fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkpoint',
          groupId: g.id,
          groupName: g.name,
          checkpointTitle: cp.title,
          finished: false,
        }),
      }).catch(() => {})
      setState('needs_survey')
      return
    }

    // Nessun media richiesto → avanza automaticamente
    setState('advancing')
    const nextIndex = g.current_checkpoint_index + 1
    const total = cps.length
    const finished = nextIndex >= total

    await supabase
      .from('groups')
      .update({
        current_checkpoint_index: nextIndex,
        finished,
        finished_at: finished ? new Date().toISOString() : null,
      })
      .eq('id', g.id)

    await supabase.from('group_progress').insert({
      group_id: g.id,
      checkpoint_id: cp.id,
    })

    // Notifica admin
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checkpoint',
        groupId: g.id,
        groupName: g.name,
        checkpointTitle: cp.title,
        finished,
      }),
    }).catch(() => {})

    setState(finished ? 'finished' : 'success')
  }

  function goToGame() {
    if (group) router.push(`/game/${group.id}`)
  }

  // ── UI ──────────────────────────────────────────────────────────

  if (state === 'loading' || state === 'advancing') {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-amber-600 mx-auto mb-3" size={36} />
          <p className="text-amber-700 font-medium">
            {state === 'advancing' ? 'Tappa completata…' : 'Verifica in corso…'}
          </p>
        </div>
      </main>
    )
  }

  if (state === 'no_group') {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <XCircle className="text-red-400 mx-auto mb-3" size={48} />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Gruppo non trovato</h1>
          <p className="text-gray-500 text-sm mb-6">
            Entra prima nell'evento tramite il link di invito del tuo gruppo.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-amber-600 text-white font-semibold px-6 py-3 rounded-2xl"
          >
            Vai alla home
          </button>
        </div>
      </main>
    )
  }

  if (state === 'not_found') {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <XCircle className="text-red-400 mx-auto mb-3" size={48} />
          <h1 className="text-xl font-bold text-gray-800 mb-2">QR non valido</h1>
          <p className="text-gray-500 text-sm">Questo codice QR non corrisponde a nessuna tappa.</p>
        </div>
      </main>
    )
  }

  if (state === 'wrong_checkpoint') {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Non è la tua tappa!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Questo QR appartiene a <strong>{checkpoint?.title}</strong>, ma il tuo gruppo è a una tappa diversa.
            Segui l'indizio!
          </p>
          <button onClick={goToGame} className="bg-amber-600 text-white font-semibold px-6 py-3 rounded-2xl">
            Torna al gioco
          </button>
        </div>
      </main>
    )
  }

  if (state === 'needs_media') {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Camera className="text-blue-500 mx-auto mb-3" size={48} />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Sei alla tappa giusta! 📍</h1>
          <p className="text-gray-600 text-sm mb-2">
            <strong>{checkpoint?.title}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Per sbloccare questa tappa devi caricare una foto o un video come prova.
          </p>
          <button onClick={goToGame} className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-2xl flex items-center gap-2 mx-auto">
            <Camera size={18} />
            Carica la prova
          </button>
        </div>
      </main>
    )
  }

  if (state === 'needs_survey') {
    return (
      <main className="min-h-screen bg-violet-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🌟</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">QR scansionato!</h1>
          <p className="text-gray-600 text-sm mb-6">
            Torna nell&apos;app per compilare il sondaggio di fine giornata.
          </p>
          <button onClick={goToGame} className="bg-violet-600 text-white font-semibold px-6 py-3 rounded-2xl">
            Vai al sondaggio
          </button>
        </div>
      </main>
    )
  }

  if (state === 'finished') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Complimenti!</h1>
          <p className="text-amber-700">Avete completato tutte le tappe!</p>
        </div>
      </main>
    )
  }

  // success
  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <CheckCircle className="text-green-500 mx-auto mb-3" size={56} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tappa completata! ✅</h1>
        <p className="text-gray-600 text-sm mb-1">
          <strong>{checkpoint?.title}</strong> sbloccata.
        </p>
        {checkpoint?.unlock_message && (
          <div className="bg-amber-100 border border-amber-200 rounded-xl p-4 my-4 text-left">
            <p className="text-xs font-semibold text-amber-700 mb-1">Messaggio sbloccato</p>
            <p className="text-sm text-amber-900">{checkpoint.unlock_message}</p>
          </div>
        )}
        <p className="text-gray-500 text-sm mb-6">Torna all'app per vedere il prossimo indizio.</p>
        <button onClick={goToGame} className="bg-amber-600 text-white font-semibold px-6 py-3 rounded-2xl flex items-center gap-2 mx-auto">
          <MapPin size={18} />
          Prossima tappa
        </button>
      </div>
    </main>
  )
}
