'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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

  const bgStyle = {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 35%, #9a3412 70%, #c2410c 100%)',
    minHeight: '100vh',
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center" style={bgStyle}>
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex flex-col items-center justify-center p-6 text-center" style={bgStyle}>
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-white mb-2">Codice non trovato</h1>
        <p className="text-slate-400 text-sm">Controlla il link che ti è stato inviato dall&apos;organizzatore.</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center p-6" style={bgStyle}>
      <div
        className="rounded-3xl w-full max-w-sm p-8 text-center"
        style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-2xl font-bold text-white mb-1">Caccia al Tesoro</h1>
        <p className="text-slate-400 text-sm mb-6">Sei stato invitato come gruppo:</p>

        <div
          className="rounded-2xl px-6 py-4 mb-6"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <p className="text-2xl font-bold text-amber-300">{(group as any)?.name}</p>
          {(group as any)?.events?.name && (
            <p className="text-sm text-amber-500 mt-1">{(group as any).events.name}</p>
          )}
        </div>

        <div
          className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6 text-left"
          style={{ background: 'rgba(99,179,237,0.1)', border: '1px solid rgba(99,179,237,0.2)' }}
        >
          <MapPin size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">
            L&apos;app userà il GPS del tuo telefono per condividere la posizione con l&apos;organizzatore durante il gioco.
          </p>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl transition-all text-lg text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 15px rgba(234,88,12,0.4)' }}
        >
          {joining && <Loader2 size={18} className="animate-spin" />}
          Inizia l&apos;avventura! 🗺️
        </button>
      </div>
    </main>
  )
}
