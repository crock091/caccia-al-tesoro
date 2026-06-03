'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PoweredByFooter from '@/components/PoweredByFooter'
import { Loader2, MapPin } from 'lucide-react'

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState('')
  const [resolvedCode, setResolvedCode] = useState('')
  const [group, setGroup] = useState<{ id: string; name: string; event_id: string } | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    params.then(p => {
      setResolvedCode(p.code)
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

  async function handleJoin() {
    if (!group) return
    setJoining(true)
    // Salva group id in localStorage per sessione
    localStorage.setItem('group_id', group.id)
    localStorage.setItem('group_name', group.name)
    router.push(`/game/${group.id}`)
  }

  const bgStyle: React.CSSProperties = {
    backgroundColor: '#0a0b0d',
    backgroundImage: `url('/game-bg.png')`,
    backgroundSize: 'auto 100vh',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center" style={bgStyle}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#6DAB3C' }} />
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" style={bgStyle}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(5,10,15,0.45) 0%, rgba(5,10,15,0.75) 45%, rgba(5,10,15,0.97) 72%, rgba(5,10,15,1) 85%)' }} />
        <div className="relative z-10 text-4xl mb-4">🔍</div>
        <h1 className="relative z-10 text-xl font-bold text-white mb-2">Codice non trovato</h1>
        <p className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Controlla il link che ti è stato inviato dall&apos;organizzatore.</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col relative overflow-hidden" style={bgStyle}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(5,10,15,0.45) 0%, rgba(5,10,15,0.75) 45%, rgba(5,10,15,0.97) 72%, rgba(5,10,15,1) 85%)' }} />

      <div className="relative z-10 mt-auto px-6 pb-4 pt-4 w-full max-w-sm mx-auto flex flex-col items-center text-center">
        <div className="bg-white rounded-2xl p-3 mb-3 shadow-lg">
          <Image src="/Logo-sito-poll.avif" alt="Logo" width={100} height={100} />
        </div>
        <h1 className="text-3xl font-black mb-1 tracking-tight" style={{ color: '#6DAB3C', textShadow: '0 0 20px rgba(109,171,60,0.35)' }}>
          Caccia al Tesoro
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Sei stato invitato come gruppo:</p>

        <div
          className="rounded-2xl px-6 py-4 mb-4 text-center"
          style={{ background: 'rgba(109,171,60,0.08)', border: '1px solid rgba(109,171,60,0.2)' }}
        >
          <p className="text-2xl font-black" style={{ color: '#6DAB3C' }}>{(group as any)?.name}</p>
          {(group as any)?.events?.name && (
            <p className="text-sm mt-1" style={{ color: 'rgba(109,171,60,0.55)' }}>{(group as any).events.name}</p>
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

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-full transition-all active:scale-95 disabled:opacity-40 text-base"
          style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#0a0b0d', boxShadow: '0 8px 28px rgba(109,171,60,0.35)' }}
        >
          {joining && <Loader2 size={18} className="animate-spin" />}
          Inizia l&apos;avventura! 🗺️
        </button>
        <PoweredByFooter dark />
      </div>
    </main>
  )
}
