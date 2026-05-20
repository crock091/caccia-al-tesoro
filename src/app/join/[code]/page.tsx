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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50">
        <Loader2 className="animate-spin text-amber-600" size={32} />
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-amber-50 p-6 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Codice non trovato</h1>
        <p className="text-gray-500 text-sm">Controlla il link che ti è stato inviato dall&apos;organizzatore.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg border border-amber-100 w-full max-w-sm p-8 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Caccia al Tesoro</h1>
        <p className="text-gray-500 text-sm mb-6">Sei stato invitato come gruppo:</p>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-6">
          <p className="text-2xl font-bold text-amber-800">{(group as any)?.name}</p>
          {(group as any)?.events?.name && (
            <p className="text-sm text-amber-600 mt-1">{(group as any).events.name}</p>
          )}
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-left">
          <MapPin size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            L&apos;app userà il GPS del tuo telefono per condividere la posizione con l&apos;organizzatore durante il gioco.
          </p>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors text-lg"
        >
          {joining && <Loader2 size={18} className="animate-spin" />}
          Inizia l&apos;avventura! 🗺️
        </button>
      </div>
    </main>
  )
}
