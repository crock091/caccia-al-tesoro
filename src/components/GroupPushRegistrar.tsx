'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

export default function GroupPushRegistrar({ groupId }: { groupId: string }) {
  const [showBanner, setShowBanner] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'granted') {
      // Già autorizzato — registra silenziosamente
      doSubscribe()
      return
    }
    if (Notification.permission === 'denied') return
    // 'default' → mostra banner
    setShowBanner(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function doSubscribe() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const keyBytes = Uint8Array.from(
        atob(vapidKey.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      )

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        })
      }

      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

      await fetch('/api/push/group-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      })
      setSubscribed(true)
    } catch (err: unknown) {
      // "push service not available" → succede su localhost o rete limitata, ignorabile
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('push service') || msg.includes('AbortError')) {
        console.warn('[GroupPushRegistrar] push service not available (localhost?)')
      } else {
        console.error('[GroupPushRegistrar]', err)
      }
    }
  }

  async function handleEnable() {
    setShowBanner(false)
    const permission = await Notification.requestPermission()
    if (permission === 'granted') doSubscribe()
  }

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-40 rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
      style={{ background: 'rgba(15,20,30,0.95)', border: '1px solid rgba(109,171,60,0.35)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)' }}
      >
        <Bell size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-tight">Abilita notifiche</p>
        <p className="text-white/50 text-xs leading-tight mt-0.5">Ricevi avvisi da chat e tappe sbloccate</p>
      </div>
      <button
        onClick={handleEnable}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#fff' }}
      >
        Attiva
      </button>
      <button onClick={() => setShowBanner(false)} className="text-white/40 flex-shrink-0 hover:text-white/70">
        <X size={16} />
      </button>
    </div>
  )
}
