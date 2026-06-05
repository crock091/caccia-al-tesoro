'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export default function PwaRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Esegui solo se siamo sulla home page
    if (pathname !== '/') return

    const groupId = localStorage.getItem('group_id')
    const cookieCode = getCookie('pic')
    const localCode = localStorage.getItem('pending_invite_code')
    const savedCode = cookieCode || localCode

    if (groupId) {
      router.replace(`/game/${groupId}`)
    } else if (savedCode) {
      router.replace(`/join/${savedCode}`)
    }
  }, [pathname, router])

  return null
}
