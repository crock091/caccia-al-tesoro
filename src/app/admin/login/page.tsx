'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
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

    // Vai alla pagina callback che verifica la sessione client-side
    // prima di procedere all'admin (compatibile iOS 15)
    window.location.replace('/auth/callback')
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-5 fade-in"
      style={{ background: 'rgb(23,55,45)', paddingTop: '2.5rem', paddingBottom: '4rem' }}
    >
      {/* Sfondo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: -3 }} src="/sfondo.jpeg" alt="" />
      <div className="fixed inset-0" style={{ zIndex: -2, background: 'rgba(18,55,43,0.70)' }} />
      <div className="fixed inset-0" style={{ zIndex: -1, background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,.16), transparent 26%), linear-gradient(to bottom, rgba(12,42,31,.1), rgba(12,42,31,.38))' }} />

      <div className="relative z-10 w-full max-w-sm paper-shadow rounded-[2rem] overflow-hidden" style={{ background: 'rgba(255,250,240,0.97)' }}>
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-sito-poll.avif" alt="Logo" style={{ height: '48px', width: 'auto', marginBottom: '1.25rem' }} />
            <h1 className="display font-bold text-[#17372d] text-2xl mb-1 text-center">Area organizzatore</h1>
            <p className="text-sm text-center" style={{ color: '#7b897f' }}>Accedi per gestire gli eventi</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#405f51' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-2xl border px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2"
                style={{ borderColor: '#d9e4da' }}
                placeholder="organizzatore@email.it"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#405f51' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2"
                style={{ borderColor: '#d9e4da' }}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#a14f40' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{ background: '#17372d', color: '#fff' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Accedi
            </button>
          </form>
        </div>
      </div>
      <Link href="/" className="relative z-10 mt-5 flex items-center justify-center gap-1.5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
        <ArrowLeft size={16} />
        Torna alla home
      </Link>
      <div style={{ position: 'relative' }}>
        <PoweredByFooter />
      </div>
    </main>
  )
}
