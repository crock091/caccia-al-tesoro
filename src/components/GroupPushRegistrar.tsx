'use client'

import { useEffect } from 'react'

export default function GroupPushRegistrar({ groupId }: { groupId: string }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await navigator.serviceWorker.ready

        // Chiedi permesso notifiche
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return

        // Converti VAPID key
        const keyBytes = Uint8Array.from(atob(vapidKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

        // Crea o recupera subscription
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes,
          })
        }

        const json = sub.toJSON()
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

        // Invia al server
        await fetch('/api/push/group-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId,
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          }),
        })
      } catch (err) {
        console.error('[GroupPushRegistrar]', err)
      }
    }

    subscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  return null
}
