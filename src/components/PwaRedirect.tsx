'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Se il gruppo ha già un codice salvato (da una visita precedente al link di invito),
// reindirizza automaticamente alla pagina join senza dover reinserire il codice.
export default function PwaRedirect() {
  const router = useRouter()

  useEffect(() => {
    const savedCode = localStorage.getItem('pending_invite_code')
    const groupId = localStorage.getItem('group_id')

    if (groupId) {
      // Già nel gruppo → vai direttamente alla game page
      router.replace(`/game/${groupId}`)
    } else if (savedCode) {
      // Ha un codice invito salvato → vai alla join page
      router.replace(`/join/${savedCode}`)
    }
  }, [router])

  return null
}
