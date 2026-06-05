'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

// Pagina intermedia: verifica la sessione client-side prima di andare all'admin.
// Necessaria su iOS 15 dove il cookie di sessione non è disponibile immediatamente
// dopo il login per il middleware SSR.
export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let attempts = 0

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.replace('/admin')
      } else if (attempts < 15) {
        attempts++
        setTimeout(checkSession, 200)
      } else {
        router.replace('/admin/login')
      }
    }

    checkSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f4f0' }}>
      <Loader2 className="animate-spin" size={32} style={{ color: '#6DAB3C' }} />
    </main>
  )
}
