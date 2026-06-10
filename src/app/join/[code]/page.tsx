'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PoweredByFooter from '@/components/PoweredByFooter'
import { Loader2, MapPin, Download, Share, X } from 'lucide-react'

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState('')
  const [resolvedCode, setResolvedCode] = useState('')
  const [group, setGroup] = useState<{ id: string; name: string; event_id: string } | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    params.then(p => {
      setResolvedCode(p.code)
      // Salva il codice in cookie (condiviso tra Safari e PWA su iOS)
      document.cookie = `pic=${p.code};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`
      loadGroup(p.code)
    })
  }, [])

  async function loadGroup(inviteCode: string) {
    setLoading(true)
    const { data } = await supabase
      .from('groups')
      .select('id, name, event_id, events(name, status)')
      .eq('invite_code', inviteCode)
      .single()

    if (!data) {
      setNotFound(true)
    } else {
      setGroup(data as { id: string; name: string; event_id: string })
    }
    setLoading(false)
  }

  async function handleInstall() {
    if (!installPrompt) return
    const evt = installPrompt as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }
    evt.prompt()
    const { outcome } = await evt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  async function handleJoin() {
    if (!group) return
    setJoining(true)
    // Salva group id in localStorage per sessione
    localStorage.setItem('group_id', group.id)
    localStorage.setItem('group_name', group.name)
    // Rimuovi il codice pendente
    localStorage.removeItem('pending_invite_code')
    document.cookie = 'pic=;path=/;max-age=0'
    // Notifica push all'admin (non bloccante, tag fisso = no spam se più device)
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'group_joined',
        groupId: group.id,
        groupName: group.name,
        eventId: group.event_id,
      }),
    }).catch(() => {})
    router.push(`/game/${group.id}`)
  }

  const bgStyle: React.CSSProperties = {
    backgroundColor: 'rgb(23,55,45)',
    backgroundImage: `url('/sfondo.jpeg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center" style={bgStyle}>
        <div className="fixed inset-0" style={{ background: 'rgba(18,55,43,0.70)' }} />
        <div className="fixed inset-0" style={{ background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 26%), linear-gradient(to bottom, rgba(12,42,31,.1), rgba(12,42,31,.38))' }} />
        <Loader2 className="animate-spin relative z-10" size={32} style={{ color: '#4ade80' }} />
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" style={bgStyle}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(18,55,43,0.70)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 26%), linear-gradient(to bottom, rgba(12,42,31,.1), rgba(12,42,31,.38))' }} />
        <div className="relative z-10 text-4xl mb-4">🔍</div>
        <h1 className="relative z-10 text-xl font-bold text-white mb-2">Codice non trovato</h1>
        <p className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Controlla il link che ti è stato inviato dall&apos;organizzatore.</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col relative overflow-hidden" style={bgStyle}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(18,55,43,0.70)', zIndex: 0 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1, background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 26%), linear-gradient(to bottom, rgba(12,42,31,.1), rgba(12,42,31,.38))' }} />

      <div className="relative z-10 mt-auto px-6 pb-4 pt-4 w-full max-w-sm mx-auto flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logo-sito-poll.avif" alt="Logo" style={{ height: '36px', width: 'auto', marginBottom: '0.75rem' }} />
        <h1 className="display text-3xl font-bold mb-1 tracking-tight" style={{ color: '#4ade80' }}>
          Caccia al Tesoro
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>Sei stato invitato come gruppo:</p>

        <div
          className="rounded-2xl px-6 py-4 mb-4 text-center"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
        >
          <p className="text-2xl font-black" style={{ color: '#4ade80' }}>{(group as any)?.name}</p>
          {(group as any)?.events?.name && (
            <p className="text-sm mt-1" style={{ color: 'rgba(74,222,128,0.55)' }}>{(group as any).events.name}</p>
          )}
        </div>

        <div
          className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6 text-left"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <MapPin size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            L&apos;app userà il GPS del tuo telefono per condividere la posizione con l&apos;organizzatore durante il gioco.
          </p>
        </div>

        {/* Banner installazione PWA */}
        {!isStandalone && !installDismissed && (installPrompt || isIos) && (
          <div
            className="w-full rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
            style={{ background: 'rgba(109,171,60,0.10)', border: '1px solid rgba(109,171,60,0.3)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)' }}
            >
              <Download size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-semibold leading-tight">Installa l&apos;app</p>
              <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Per ricevere notifiche su chat e tappe
              </p>
            </div>
            <button
              onClick={isIos ? () => setShowIosInstructions(true) : handleInstall}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#fff' }}
            >
              {isIos ? 'Come fare' : 'Installa'}
            </button>
            <button onClick={() => setInstallDismissed(true)} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Modal istruzioni iOS */}
        {showIosInstructions && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#0f1a0f', border: '1px solid rgba(109,171,60,0.3)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Installa l&apos;app su iPhone</h2>
                <button onClick={() => setShowIosInstructions(false)} style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={20} />
                </button>
              </div>
              <ol className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(109,171,60,0.2)', color: '#6DAB3C' }}>1</span>
                  <div>
                    <p className="text-white text-sm font-medium">Tocca il pulsante Condividi</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>In basso nella barra di Safari (icona ⬆️ con riquadro)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(109,171,60,0.2)', color: '#6DAB3C' }}>2</span>
                  <div>
                    <p className="text-white text-sm font-medium">Scorri e tocca &quot;Aggiungi a schermata Home&quot;</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Cerca l&apos;icona con il &quot;+&quot; nel menu</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(109,171,60,0.2)', color: '#6DAB3C' }}>3</span>
                  <div>
                    <p className="text-white text-sm font-medium">Apri l&apos;app dalla schermata Home</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Poi potrai attivare le notifiche dall&apos;interno dell&apos;app</p>
                  </div>
                </li>
              </ol>
              <button
                onClick={() => setShowIosInstructions(false)}
                className="w-full mt-6 py-3 rounded-2xl font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#fff' }}
              >
                Ho capito
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40 text-base"
          style={{ background: '#17372d', color: '#fff', boxShadow: '0 8px 28px rgba(23,55,45,0.45)' }}
        >
          {joining && <Loader2 size={18} className="animate-spin" />}
          Inizia l&apos;avventura! 🗺️
        </button>
        <PoweredByFooter dark />
      </div>
    </main>
  )
}
