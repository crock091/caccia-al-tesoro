'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(console.error)

    // Pulisci il badge quando l'admin apre l'app
    try {
      if ('clearAppBadge' in navigator) (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge()
    } catch { /* non supportato */ }

    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'CLEAR_BADGE' })
    }).catch(() => {})
  }, [])

  return null
}
