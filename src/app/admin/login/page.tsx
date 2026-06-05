'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import PoweredByFooter from '@/components/PoweredByFooter'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenziali non valide. Riprova.')
      setLoading(false)
      return
    }

    // Usa reload completo invece di router.push per garantire
    // che il cookie di sessione sia inviato correttamente su iOS 15
    window.location.href = '/admin'
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center p-4"
      style={{
        backgroundColor: '#f0f4f0',
        backgroundImage: "url('/immagine-desktop.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(2px)' }} />
      <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col justify-center">
        <div className="text-center mb-6">
          <div className="bg-white rounded-2xl p-3 shadow-lg inline-block mb-4">
            <Image src="/Logo-sito-poll.avif" alt="Logo" width={100} height={100} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Area organizzatore</h1>
          <p className="text-sm mt-1 text-gray-500">Accedi per gestire gli eventi</p>
        </div>

        <div className="rounded-2xl p-8 bg-white" style={{ border: '1px solid rgba(109,171,60,0.25)', boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(109,171,60,0.9)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2"
                style={{ border: '1px solid rgba(109,171,60,0.35)' }}
                placeholder="organizzatore@email.it"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(109,171,60,0.9)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2"
                style={{ border: '1px solid rgba(109,171,60,0.35)' }}
              />
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#fff' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Accedi
            </button>
          </form>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <PoweredByFooter />
      </div>
    </main>
  )
}
